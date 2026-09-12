import { FormInput, FormSelect } from "@/components/ui/form-fields";
import { genderItems } from "@/data/application-form";

export function ApplicantStep() {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <FormInput
        label="First name"
        name="firstName"
        placeholder="e.g. Selma"
      />
      <FormInput
        label="Surname"
        name="lastName"
        placeholder="e.g. Nghidinwa"
      />
      <FormInput
        label="Email address"
        name="email"
        type="email"
        placeholder="name@example.com"
      />
      <FormInput
        label="Contact number"
        name="phone"
        placeholder="+264"
      />
      <FormSelect
        label="Gender"
        name="gender"
        items={genderItems}
        placeholder="Select"
      />
      <FormInput
        label="Age"
        name="age"
        type="number"
        registrationOptions={{ valueAsNumber: true }}
      />
      <FormInput
        label="Nationality"
        name="nationality"
        placeholder="e.g. Namibian"
      />
    </div>
  );
}
