"use client";

import { useField } from "@payloadcms/ui";
import type { TextFieldClientProps } from "payload";
import { FormSelect } from "@/components/ui/form-fields";

export default function CmsEventTimezoneField({
  path,
  readOnly,
}: TextFieldClientProps) {
  const state = useField<string>({ potentiallyStalePath: path });
  const zone = state.value || "Africa/Windhoek";
  const zones = Intl.supportedValuesOf("timeZone");
  if (!zones.includes(zone)) zones.unshift(zone);
  const disabled = Boolean(readOnly || state.disabled);

  return (
    <FormSelect
      label="Timezone"
      name={state.path}
      required
      items={zones.map((value) => ({ label: value, value }))}
      value={zone}
      disabled={disabled}
      error={state.showError ? state.errorMessage : undefined}
      onChange={(event) => {
        if (!disabled) state.setValue(event.target.value);
      }}
    />
  );
}
