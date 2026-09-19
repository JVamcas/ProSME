"use client";

import { parseDate, type DateValue } from "@internationalized/date";
import { useState, type ChangeEvent, type ReactNode } from "react";
import { DatePicker, I18nProvider } from "react-aria-components";
import {
  type Control,
  type FieldValues,
  type UseFormSetValue,
  useFormContext,
  useWatch,
} from "react-hook-form";

import { type FormBindingProps, useFormBinding } from "./form-binding";
import { DateCalendarPopover } from "./form-date-calendar";
import {
  DateControl,
  DateFeedback,
  DateLabel,
  DateRegistrationInput,
} from "./form-date-parts";

export type FormDateInputProps = FormBindingProps & {
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
  value?: string;
};

function parseDateValue(value?: string) {
  if (!value) {
    return null;
  }
  try {
    return parseDate(value);
  } catch {
    return null;
  }
}

function createFieldEvent(
  name: string | undefined,
  value: string,
  type: "blur" | "change",
) {
  return {
    target: { name, type: "date", value },
    currentTarget: { name, type: "date", value },
    type,
  } as unknown as ChangeEvent<HTMLInputElement>;
}

function DateInputField({
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
  value,
}: FormDateInputProps) {
  const binding = useFormBinding({ error, name, registrationOptions });
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const currentValue = value ?? internalValue;

  function change(nextValue: DateValue | null) {
    const next = nextValue?.toString() ?? "";
    if (value === undefined) {
      setInternalValue(next);
    }

    const event = createFieldEvent(binding.name, next, "change");
    void binding.registration?.onChange(event);
    onChangeValue?.(next);
  }

  const parsedMinValue = parseDateValue(minValue) ?? undefined;
  const parsedMaxValue = parseDateValue(maxValue) ?? undefined;

  return (
    <I18nProvider locale="en-GB">
      <DatePicker
        value={parseDateValue(currentValue)}
        minValue={parsedMinValue}
        maxValue={parsedMaxValue}
        isDisabled={disabled}
        isReadOnly={readOnly}
        isRequired={required}
        isInvalid={Boolean(binding.error)}
        onBlur={() => {
          const event = createFieldEvent(binding.name, currentValue, "blur");
          void binding.registration?.onBlur(event);
          onBlurValue?.(currentValue);
        }}
        onFocus={() => onFocusValue?.(currentValue)}
        onChange={change}
        className={containerClassName}
      >
        <DateLabel className={labelClassName}>
          {label}
          {required ? (
            <span aria-hidden="true" className="ml-1 text-brand-orange">
              *
            </span>
          ) : null}
        </DateLabel>
        <DateControl className={className} error={binding.error} />
        <DateCalendarPopover
          maxValue={parsedMaxValue}
          minValue={parsedMinValue}
        />
        <DateRegistrationInput
          inputRef={binding.registration?.ref}
          name={binding.name}
          value={currentValue}
        />
        <DateFeedback description={description} error={binding.error} />
      </DatePicker>
    </I18nProvider>
  );
}

function ControlledDateInput({
  control,
  setValue,
  ...props
}: FormDateInputProps & {
  control: Control<FieldValues>;
  name: string;
  setValue: UseFormSetValue<FieldValues>;
}) {
  const formValue = useWatch({ control, name: props.name });
  const value = props.value ?? (
    typeof formValue === "string" ? formValue : ""
  );
  return (
    <DateInputField
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

export function FormDateInput(props: FormDateInputProps) {
  const form = useFormContext<FieldValues>();
  if (form && props.name) {
    return (
      <ControlledDateInput
        {...props}
        control={form.control}
        name={props.name}
        setValue={form.setValue}
      />
    );
  }
  return <DateInputField {...props} />;
}
