"use client";

import ConfigProvider from "antd/es/config-provider";
import DatePicker from "antd/es/date-picker";
import enGB from "antd/locale/en_GB";
import dayjs, { type Dayjs } from "dayjs";
import { useId, useState, type ReactNode } from "react";
import {
  useFormContext,
  useWatch,
  type Control,
  type FieldValues,
  type UseFormSetValue,
} from "react-hook-form";

import { type FormBindingProps, useFormBinding } from "@/components/ui/form-binding";
import { FormField } from "@/components/ui/form-field";
import type { FormControlSize } from "@/components/ui/form-fields";
import { cn } from "@/lib/utils";
import {
  disabledFormDateTimes,
  formatFormDate,
  isFormDateInRange,
  parseFormDate,
} from "@/shared/utils/formDateValues";
import { DateCalendarActions } from "./FormDateCalendarActions";

export type FormDatePickerFieldProps = FormBindingProps & {
  className?: string;
  containerClassName?: string;
  defaultValue?: string;
  description?: ReactNode;
  disabled?: boolean;
  label: ReactNode;
  labelClassName?: string;
  maxValue?: string;
  minValue?: string;
  onBlurValue?: (value: string) => void;
  onChangeValue?: (value: string) => void;
  onFocusValue?: (value: string) => void;
  readOnly?: boolean;
  required?: boolean;
  size?: FormControlSize;
  value?: string;
};

type PickerFieldProps = FormDatePickerFieldProps & { withTime?: boolean };

function DatePickerField({
  className,
  containerClassName,
  defaultValue,
  description,
  disabled,
  error,
  label,
  labelClassName,
  maxValue,
  minValue,
  name,
  onBlurValue,
  onChangeValue,
  onFocusValue,
  readOnly,
  registrationOptions,
  required,
  size = "default",
  value,
  withTime = false,
}: PickerFieldProps) {
  const binding = useFormBinding({ error, name, registrationOptions });
  const generatedId = useId();
  const controlId = binding.name ?? generatedId;
  const errorId = binding.error ? `${controlId}-error` : undefined;
  const descriptionId = description && !binding.error
    ? `${controlId}-description`
    : undefined;
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const currentValue = value ?? internalValue;
  const selected = parseFormDate(currentValue, withTime);
  const min = parseFormDate(minValue, withTime);
  const max = parseFormDate(maxValue, withTime);

  function change(nextValue: Dayjs | null) {
    if (
      disabled ||
      readOnly ||
      (nextValue && !isFormDateInRange(nextValue, min, max))
    ) {
      return;
    }

    const next = formatFormDate(nextValue, withTime);
    if (value === undefined) {
      setInternalValue(next);
    }
    void binding.registration?.onChange({
      target: { name: binding.name, value: next },
      type: "change",
    });
    onChangeValue?.(next);
  }

  return (
    <FormField
      className={containerClassName}
      error={binding.error}
      errorId={errorId}
      htmlFor={controlId}
      label={label}
      labelClassName={labelClassName}
      required={required}
    >
      <ConfigProvider
        locale={enGB}
        theme={{
          token: {
            borderRadius: size === "compact" ? 8 : 12,
            colorPrimary: "#ff6f00",
            colorText: "#0a183b",
            controlHeight: size === "compact" ? 32 : 48,
            fontFamily: "inherit",
            fontSize: size === "compact" ? 12 : 14,
          },
          components: {
            DatePicker: {
              paddingInline: size === "compact" ? 12 : 16,
              zIndexPopup: 1100,
            },
          },
        }}
      >
        <DatePicker
          allowClear={!readOnly}
          aria-describedby={errorId ?? descriptionId}
          aria-invalid={Boolean(binding.error)}
          aria-readonly={readOnly}
          aria-required={required}
          className={cn("w-full", className)}
          disabled={disabled}
          disabledTime={
            withTime
              ? (date) => disabledFormDateTimes(date, min, max)
              : undefined
          }
          format={withTime ? "DD/MM/YYYY HH:mm" : "DD/MM/YYYY"}
          id={controlId}
          inputReadOnly={readOnly}
          maxDate={max?.endOf("day")}
          minDate={min?.startOf("day")}
          onBlur={() => {
            void binding.registration?.onBlur({
              target: { name: binding.name, value: currentValue },
              type: "blur",
            });
            onBlurValue?.(currentValue);
          }}
          onChange={change}
          onFocus={() => onFocusValue?.(currentValue)}
          onOpenChange={setOpen}
          open={open && !readOnly && !disabled}
          placeholder={withTime ? "DD/MM/YYYY HH:mm" : "DD/MM/YYYY"}
          previewValue={false}
          renderExtraFooter={() => (
            <DateCalendarActions
              max={max}
              min={min}
              onChange={change}
              onClose={() => setOpen(false)}
              value={selected}
              withTime={withTime}
            />
          )}
          required={required}
          showNow={false}
          showTime={
            withTime
              ? {
                  defaultOpenValue: dayjs().startOf("day"),
                  format: "HH:mm",
                  showSecond: false,
                }
              : false
          }
          status={binding.error ? "error" : undefined}
          value={selected}
        />
      </ConfigProvider>
      <input
        ref={binding.registration?.ref}
        name={binding.name}
        readOnly
        type="hidden"
        value={currentValue}
      />
      {descriptionId ? (
        <p className="mt-1.5 text-xs text-slate-500" id={descriptionId}>
          {description}
        </p>
      ) : null}
    </FormField>
  );
}

function ControlledDatePickerField({
  control,
  setValue,
  ...props
}: PickerFieldProps & {
  control: Control<FieldValues>;
  name: string;
  setValue: UseFormSetValue<FieldValues>;
}) {
  const formValue = useWatch({ control, name: props.name });
  const value = props.value ?? (typeof formValue === "string" ? formValue : "");

  return (
    <DatePickerField
      {...props}
      onChangeValue={(nextValue) => {
        setValue(props.name, nextValue, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        });
        props.onChangeValue?.(nextValue);
      }}
      value={value}
    />
  );
}

export function FormDatePickerField(props: PickerFieldProps) {
  const form = useFormContext<FieldValues>();
  if (form && props.name) {
    return (
      <ControlledDatePickerField
        {...props}
        control={form.control}
        name={props.name}
        setValue={form.setValue}
      />
    );
  }

  return <DatePickerField {...props} />;
}
