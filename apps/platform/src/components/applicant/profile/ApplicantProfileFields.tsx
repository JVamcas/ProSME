import { FormInput, FormSelect, FormTextarea } from "@/components/ui/form-fields";
import { FormDateInput } from "@/components/ui/form-date-input";
import {
  namibianRegions,
  selectItems,
} from "@/modules/profiles/ProfileOptions";

export type ApplicantProfileSection = "contact" | "personal";

export function ApplicantProfileFields({
  disabled,
  email,
  section,
}: {
  disabled?: boolean;
  email: string;
  section: ApplicantProfileSection;
}) {
  if (section === "personal") {
    return (
      <>
        <FormInput
          disabled={disabled}
          label="First name"
          name="firstName"
          autoComplete="given-name"
        />
        <FormInput
          disabled={disabled}
          label="Surname"
          name="surname"
          autoComplete="family-name"
        />
        <FormInput disabled={disabled} label="Position" name="position" />
        <FormDateInput
          disabled={disabled}
          label="Date of birth"
          name="dateOfBirth"
        />
        <FormInput
          disabled={disabled}
          label="Nationality"
          name="nationality"
          autoComplete="country-name"
        />
        <FormSelect
          disabled={disabled}
          label="Region"
          name="region"
          items={selectItems(namibianRegions)}
          placeholder="Select a region"
        />
      </>
    );
  }

  return (
    <>
      <FormInput label="Email address" value={email} disabled readOnly />
      <FormInput
        disabled={disabled}
        label="Phone number"
        name="phoneNumber"
        type="tel"
        autoComplete="tel"
      />
      <FormTextarea
        disabled={disabled}
        containerClassName="sm:col-span-2"
        label="Postal address"
        name="postalAddress"
        autoComplete="postal-code"
      />
    </>
  );
}
