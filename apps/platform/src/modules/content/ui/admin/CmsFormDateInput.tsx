"use client";

import { getTranslation } from "@payloadcms/translations";
import { FieldDescription, useField, useTranslation, withCondition } from "@payloadcms/ui";
import type { DateFieldClientProps, Validate } from "payload";
import { useCallback } from "react";

import { toInputDate } from "@/lib/dateUtils";
import { FormDateInput } from "@/shared/ui/FormDateInput";
import { parseFormDate } from "@/shared/utils/formDateValues";

function CmsDateInput({ field, path, readOnly, validate }: DateFieldClientProps) {
  const { i18n } = useTranslation();
  const validator = useCallback<Validate>(
    (value, options) => validate?.(value, {
      ...options,
      name: field.name,
      type: "date",
      required: field.required,
    }) ?? true,
    [validate, field.name, field.required],
  );
  const state = useField<string | null>({
    potentiallyStalePath: path,
    validate: validator,
  });
  const disabled = Boolean(readOnly || state.disabled);
  const description = field.admin?.description;

  return (
    <FormDateInput
      containerClassName="mb-6 font-sans"
      name={state.path}
      label={getTranslation(field.label || field.name, i18n)}
      required={field.required}
      disabled={disabled}
      value={toInputDate(state.value ?? undefined)}
      error={state.showError ? state.errorMessage : undefined}
      description={description ? (
        <FieldDescription path={state.path} description={description} />
      ) : undefined}
      onChangeValue={(value) => {
        if (disabled) return;
        if (!value) {
          state.setValue(null);
          return;
        }
        const date = parseFormDate(value);
        if (date) {
          // Match Payload's date-only picker: local noon stored as an ISO instant.
          state.setValue(date.hour(12).toISOString());
        }
      }}
    />
  );
}

export default withCondition(CmsDateInput);
