import { FormInput, FormSelect, FormTextarea } from "@/components/ui/form-fields";
import {
  businessTypes,
  namibianRegions,
  selectItems,
} from "@/modules/profiles/ProfileOptions";

export function BusinessProfileFields({ disabled }: { disabled?: boolean }) {
  return (
    <>
      <FormInput
        disabled={disabled}
        label="Legal business name"
        name="legalName"
        required
      />
      <FormInput disabled={disabled} label="Trading name" name="tradingName" />
      <FormInput
        disabled={disabled}
        label="Registration number"
        name="registrationNumber"
      />
      <FormSelect
        disabled={disabled}
        label="Business type"
        name="businessType"
        items={selectItems(businessTypes)}
        placeholder="Select a business type"
        required
      />
      <FormInput
        disabled={disabled}
        label="Sector"
        name="sector"
        required
      />
      <FormSelect
        disabled={disabled}
        label="Region"
        name="region"
        items={selectItems(namibianRegions)}
        placeholder="Select a region"
        required
      />
      <FormInput
        disabled={disabled}
        label="Year established"
        name="establishedYear"
        inputMode="numeric"
        maxLength={4}
      />
      <FormInput
        disabled={disabled}
        label="Number of employees"
        name="employeeCount"
        inputMode="numeric"
      />
      <FormTextarea
        disabled={disabled}
        containerClassName="sm:col-span-2"
        label="Physical address"
        name="physicalAddress"
        autoComplete="street-address"
        required
      />
    </>
  );
}
