import { FormInput, FormTextarea } from "@/components/ui/form-fields";

export function FundingSection() {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <FormInput
        label="Amount requested (N$)"
        name="amountRequested"
        type="number"
        min="50000"
        max="100000"
        step="1000"
        registrationOptions={{ valueAsNumber: true }}
      />
      <FormInput
        label="Jobs expected to be created"
        name="jobs"
        type="number"
        min="0"
        registrationOptions={{ valueAsNumber: true }}
      />
      <FormTextarea
        containerClassName="sm:col-span-2"
        label="How will the funding be used?"
        name="useOfFunds"
        placeholder="Describe the specific investment and why it is needed..."
      />
      <FormTextarea
        containerClassName="sm:col-span-2"
        label="What outcomes do you expect?"
        name="expectedOutcomes"
        placeholder="Describe measurable growth, productivity, market or employment outcomes..."
      />
    </div>
  );
}
