"use client";

import { useField, useFormFields, withCondition } from "@payloadcms/ui";
import type { DateFieldClientProps, Validate } from "payload";
import { useCallback } from "react";
import { FormDateTimeInput } from "@/shared/ui/FormDateTimeInput";
import {
  eventLocalSchedule,
  eventScheduleInstant,
} from "../../domain/EventSchedule";

function CmsEventScheduleField({
  field,
  path,
  readOnly,
  validate,
}: DateFieldClientProps) {
  const validator = useCallback<Validate>(
    (value, options) =>
      validate?.(value, {
        ...options,
        name: field.name,
        type: "date",
        required: field.required,
      }) ?? true,
    [validate, field.name, field.required],
  );
  const start = useField<string | null>({
    potentiallyStalePath: path,
    validate: validator,
  });
  const end = useField<string | null>({ path: "endsAt" });
  const zone = useFormFields(([fields]) => {
    const value = fields.timezone?.value;
    return typeof value === "string" ? value : "Africa/Windhoek";
  });
  const localStart = eventLocalSchedule(start.value, zone);
  const localEnd = eventLocalSchedule(end.value, zone);
  const disabled = Boolean(readOnly || start.disabled);

  const startValue = localStart.date
    ? `${localStart.date}T${localStart.time}`
    : "";
  const endValue = localEnd.date ? `${localEnd.date}T${localEnd.time}` : "";

  function toInstant(value: string) {
    const [date, time] = value.split("T");
    return eventScheduleInstant(date ?? "", time?.slice(0, 5) ?? "", zone);
  }

  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2">
      <FormDateTimeInput
        name="eventStartDateTime"
        label="Start date and time"
        required={field.required}
        disabled={disabled}
        value={startValue}
        error={start.showError ? start.errorMessage : undefined}
        onChangeValue={(value) => {
          if (disabled) return;
          const instant = value ? toInstant(value) : null;
          if (!value || instant) start.setValue(instant);
        }}
      />
      <FormDateTimeInput
        name="eventEndDateTime"
        label="End date and time"
        disabled={disabled || end.disabled}
        value={endValue}
        error={end.showError ? end.errorMessage : undefined}
        onChangeValue={(value) => {
          if (disabled || end.disabled) return;
          const instant = value ? toInstant(value) : null;
          if (!value || instant) end.setValue(instant);
        }}
      />
    </div>
  );
}

export default withCondition(CmsEventScheduleField);
