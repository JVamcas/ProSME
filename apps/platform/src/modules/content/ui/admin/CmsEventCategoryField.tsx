"use client";

import { useField, useForm } from "@payloadcms/ui";
import type { TextFieldClientProps } from "payload";
import { FormSelect } from "@/components/ui/form-fields";
import { eventTypeOptions } from "../../domain/EventMetadata";

export default function CmsEventCategoryField({
  path,
  readOnly,
}: TextFieldClientProps) {
  const state = useField<string>({ potentiallyStalePath: path });
  const { dispatchFields } = useForm();
  const items = [{ label: "General", value: "General" }, ...eventTypeOptions];
  if (state.value && !items.some((item) => item.value === state.value)) {
    items.push({ label: state.value, value: state.value });
  }
  const disabled = Boolean(readOnly || state.disabled);

  return (
    <FormSelect
      label="Category"
      name={state.path}
      items={items}
      value={state.value || "General"}
      disabled={disabled}
      error={state.showError ? state.errorMessage : undefined}
      onChange={(event) => {
        if (disabled) return;
        const value = event.target.value;
        state.setValue(value);
        if (eventTypeOptions.some((item) => item.value === value)) {
          dispatchFields({ type: "UPDATE", path: "eventType", value });
        }
      }}
    />
  );
}
