"use client";

import {
  parseDateTime,
  type CalendarDateTime,
  type DateValue,
} from "@internationalized/date";
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

export type FormDateTimeInputProps = FormBindingProps & {
  className?: string;
  containerClassName?: string;
  defaultValue?: string;
  description?: ReactNode;
  disabled?: boolean;
  label: ReactNode;
  labelClassName?: string;
  maxValue?: string;
  minValue?: string;
  onChangeValue?: (value: string) => void;
  readOnly?: boolean;
  required?: boolean;
  value?: string;
};

function parseDateTimeValue(value?: string): CalendarDateTime | null {
  if (!value) {
    return null;
  }

  try {
    return parseDateTime(value);
  } catch {
    return null;
  }
}

function createFieldEvent(name: string | undefined, value: string) {
  return {
    target: { name, type: "datetime-local", value },
    currentTarget: { name, type: "datetime-local", value },
    type: "change",
  } as unknown as ChangeEvent<HTMLInputElement>;
}

function DateTimeInputField({
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
  onChangeValue,
  readOnly,
  registrationOptions,
  required,
  value,
}: FormDateTimeInputProps) {
  const binding = useFormBinding({ error, name, registrationOptions });
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const currentValue = value ?? internalValue;
  const parsedMinValue = parseDateTimeValue(minValue) ?? undefined;
  const parsedMaxValue = parseDateTimeValue(maxValue) ?? undefined;

  function change(nextValue: DateValue | null) {
    const next = nextValue?.toString() ?? "";
    if (value === undefined) {
      setInternalValue(next);
    }

    void binding.registration?.onChange(
      createFieldEvent(binding.name, next),
    );
    onChangeValue?.(next);
  }

  return (
    <I18nProvider locale="en-GB">
      <DatePicker
        className={containerClassName}
        granularity="minute"
        hideTimeZone
        hourCycle={24}
        isDisabled={disabled}
        isInvalid={Boolean(binding.error)}
        isReadOnly={readOnly}
        isRequired={required}
        maxValue={parsedMaxValue}
        minValue={parsedMinValue}
        onBlur={binding.registration?.onBlur}
        onChange={change}
        value={parseDateTimeValue(currentValue)}
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

function ControlledDateTimeInput({
  control,
  setValue,
  ...props
}: FormDateTimeInputProps & {
  control: Control<FieldValues>;
  name: string;
  setValue: UseFormSetValue<FieldValues>;
}) {
  const formValue = useWatch({ control, name: props.name });
  const value = props.value ?? (
    typeof formValue === "string" ? formValue : ""
  );

  return (
    <DateTimeInputField
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

export function FormDateTimeInput(props: FormDateTimeInputProps) {
  const form = useFormContext<FieldValues>();
  if (form && props.name) {
    return (
      <ControlledDateTimeInput
        {...props}
        control={form.control}
        name={props.name}
        setValue={form.setValue}
      />
    );
  }

  return <DateTimeInputField {...props} />;
}
