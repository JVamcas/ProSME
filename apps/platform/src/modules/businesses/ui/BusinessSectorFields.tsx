"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { FormInput, FormSelect } from "@/components/ui/form-fields";
import type { BusinessProfileInput } from "../BusinessSchemas";
import {
  businessSectorOptions,
  otherBusinessSector,
} from "../domain/BusinessSectors";

export function BusinessSectorFields({ disabled }: { disabled?: boolean }) {
  const { control } = useFormContext<BusinessProfileInput>();
  const [primary, secondary] = useWatch({
    control,
    name: ["sector", "secondarySector"],
  });
  return (
    <>
      <FormSelect
        disabled={disabled}
        items={businessSectorOptions}
        label="Primary sector"
        name="sector"
        placeholder="Select a primary sector"
        required
      />
      <FormSelect
        disabled={disabled}
        items={businessSectorOptions}
        label="Secondary sector (optional)"
        name="secondarySector"
        placeholder="No secondary sector"
      />
      {primary === otherBusinessSector ? (
        <FormInput
          disabled={disabled}
          label="Specify primary sector"
          name="sectorOther"
          maxLength={120}
          required
        />
      ) : null}
      {secondary === otherBusinessSector ? (
        <FormInput
          disabled={disabled}
          label="Specify secondary sector"
          name="secondarySectorOther"
          maxLength={120}
          required
        />
      ) : null}
    </>
  );
}
