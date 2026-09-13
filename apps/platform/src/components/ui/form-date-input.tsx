"use client";

import { parseDate, type DateValue } from "@internationalized/date";
import { useState, type ChangeEvent, type ReactNode } from "react";
import { DatePicker, I18nProvider } from "react-aria-components";

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
  onChangeValue?: (value: string) => void;
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

export function FormDateInput({
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
}: FormDateInputProps) {
  const binding = useFormBinding({ error, name, registrationOptions });
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const currentValue = value ?? internalValue;

  function change(nextValue: DateValue | null) {
    const next = nextValue?.toString() ?? "";
    if (value === undefined) {
      setInternalValue(next);
    }

    onChangeValue?.(next);
    const event = createFieldEvent(binding.name, next, "change");
    void binding.registration?.onChange(event);
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
        }}
        onChange={change}
        className={containerClassName}
      >
        <DateLabel className={labelClassName}>{label}</DateLabel>
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
