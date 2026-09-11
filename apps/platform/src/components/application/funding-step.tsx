import type { FieldErrors, UseFormRegister } from "react-hook-form";

import { Input, Textarea } from "@/components/ui/form-controls";
import type { ApplicationValues } from "@/data/application-schema";
import { ApplicationFormField } from "./application-form-field";

export function FundingStep({ register, errors }: { register: UseFormRegister<ApplicationValues>; errors: FieldErrors<ApplicationValues> }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <ApplicationFormField htmlFor="amountRequested" label="Amount requested (N$)" error={errors.amountRequested?.message}><Input id="amountRequested" type="number" min="50000" max="100000" step="1000" {...register("amountRequested", { valueAsNumber: true })} /></ApplicationFormField>
      <ApplicationFormField htmlFor="jobs" label="Jobs expected to be created" error={errors.jobs?.message}><Input id="jobs" type="number" min="0" {...register("jobs", { valueAsNumber: true })} /></ApplicationFormField>
      <div className="sm:col-span-2"><ApplicationFormField htmlFor="useOfFunds" label="How will the funding be used?" error={errors.useOfFunds?.message}><Textarea id="useOfFunds" {...register("useOfFunds")} placeholder="Describe the specific investment and why it is needed..." /></ApplicationFormField></div>
      <div className="sm:col-span-2"><ApplicationFormField htmlFor="expectedOutcomes" label="What outcomes do you expect?" error={errors.expectedOutcomes?.message}><Textarea id="expectedOutcomes" {...register("expectedOutcomes")} placeholder="Describe measurable growth, productivity, market or employment outcomes..." /></ApplicationFormField></div>
    </div>
  );
}
