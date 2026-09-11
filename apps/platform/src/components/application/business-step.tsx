import type { FieldErrors, UseFormRegister } from "react-hook-form";

import { Input, Select } from "@/components/ui/form-controls";
import type { ApplicationValues } from "@/data/application-schema";
import { regions } from "@/data/application-form";
import { ApplicationFormField } from "./application-form-field";

export function BusinessStep({ register, errors }: { register: UseFormRegister<ApplicationValues>; errors: FieldErrors<ApplicationValues> }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <ApplicationFormField htmlFor="businessName" label="Registered business name" error={errors.businessName?.message}><Input id="businessName" {...register("businessName")} /></ApplicationFormField>
      <ApplicationFormField htmlFor="registrationNumber" label="Registration number" error={errors.registrationNumber?.message}><Input id="registrationNumber" {...register("registrationNumber")} /></ApplicationFormField>
      <ApplicationFormField htmlFor="position" label="Your position" error={errors.position?.message}><Input id="position" {...register("position")} placeholder="e.g. Managing member" /></ApplicationFormField>
      <ApplicationFormField htmlFor="yearsOperating" label="Years in operation" error={errors.yearsOperating?.message}><Select id="yearsOperating" {...register("yearsOperating")}><option value="">Select</option><option>1–2 years</option><option>2–3 years</option><option>3–5 years</option><option>More than 5 years</option></Select></ApplicationFormField>
      <ApplicationFormField htmlFor="annualTurnover" label="Annual turnover" error={errors.annualTurnover?.message}><Select id="annualTurnover" {...register("annualTurnover")}><option value="">Select range</option><option>Up to N$250,000</option><option>N$250,001–N$500,000</option><option>N$500,001–N$1,000,000</option><option>Above N$1,000,000</option></Select></ApplicationFormField>
      <ApplicationFormField htmlFor="employees" label="Current employees" error={errors.employees?.message}><Input id="employees" type="number" min="0" {...register("employees", { valueAsNumber: true })} /></ApplicationFormField>
      <ApplicationFormField htmlFor="sector" label="Primary sector" error={errors.sector?.message}><Select id="sector" {...register("sector")}><option value="">Select sector</option><option>Agro-processing</option><option>Agriculture</option><option>Manufacturing</option><option>Tourism</option><option>Technology</option><option>Renewable energy</option><option>Creative industries</option><option>Other</option></Select></ApplicationFormField>
      <ApplicationFormField htmlFor="region" label="Region of operation" error={errors.region?.message}><Select id="region" {...register("region")}><option value="">Select region</option>{regions.map((region) => <option key={region}>{region}</option>)}</Select></ApplicationFormField>
      <div className="sm:col-span-2"><ApplicationFormField htmlFor="exportReady" label="Export or market expansion readiness" error={errors.exportReady?.message}><Select id="exportReady" {...register("exportReady")}><option value="">Select</option><option>Ready to expand locally</option><option>Preparing for regional export</option><option>Already exporting</option><option>Seeking investment opportunities</option></Select></ApplicationFormField></div>
    </div>
  );
}
