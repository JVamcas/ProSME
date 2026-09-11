import type { FieldErrors, UseFormRegister } from "react-hook-form";

import { Input, Select } from "@/components/ui/form-controls";
import type { ApplicationValues } from "@/data/application-schema";
import { ApplicationFormField } from "./application-form-field";

export function ApplicantStep({ register, errors }: { register: UseFormRegister<ApplicationValues>; errors: FieldErrors<ApplicationValues> }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <ApplicationFormField htmlFor="firstName" label="First name" error={errors.firstName?.message}><Input id="firstName" {...register("firstName")} placeholder="e.g. Selma" /></ApplicationFormField>
      <ApplicationFormField htmlFor="lastName" label="Surname" error={errors.lastName?.message}><Input id="lastName" {...register("lastName")} placeholder="e.g. Nghidinwa" /></ApplicationFormField>
      <ApplicationFormField htmlFor="email" label="Email address" error={errors.email?.message}><Input id="email" type="email" {...register("email")} placeholder="name@example.com" /></ApplicationFormField>
      <ApplicationFormField htmlFor="phone" label="Contact number" error={errors.phone?.message}><Input id="phone" {...register("phone")} placeholder="+264" /></ApplicationFormField>
      <ApplicationFormField htmlFor="gender" label="Gender" error={errors.gender?.message}><Select id="gender" {...register("gender")}><option value="">Select</option><option>Female</option><option>Male</option><option>Prefer not to say</option></Select></ApplicationFormField>
      <ApplicationFormField htmlFor="age" label="Age" error={errors.age?.message}><Input id="age" type="number" {...register("age", { valueAsNumber: true })} /></ApplicationFormField>
      <ApplicationFormField htmlFor="nationality" label="Nationality" error={errors.nationality?.message}><Input id="nationality" {...register("nationality")} placeholder="e.g. Namibian" /></ApplicationFormField>
    </div>
  );
}
