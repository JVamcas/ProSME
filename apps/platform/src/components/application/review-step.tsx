import type { FieldErrors, UseFormRegister } from "react-hook-form";

import { FieldError } from "@/components/ui/form-controls";
import { applicationDocuments } from "@/data/application-form";
import type { ApplicationValues } from "@/data/application-schema";

export function ReviewStep({ values, documentCount, register, errors }: { values: ApplicationValues; documentCount: number; register: UseFormRegister<ApplicationValues>; errors: FieldErrors<ApplicationValues> }) {
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 rounded-2xl bg-slate-50 p-5 sm:grid-cols-2">
        <Summary label="Applicant" primary={`${values.firstName} ${values.lastName}`} secondary={values.email} />
        <Summary label="Business" primary={values.businessName} secondary={`${values.sector} · ${values.region}`} />
        <Summary label="Funding request" primary={`N$${Number(values.amountRequested || 0).toLocaleString("en-NA")}`} secondary={`${values.jobs || 0} expected new jobs`} />
        <Summary label="Documents selected" primary={`${documentCount} of ${applicationDocuments.length}`} secondary="Verification follows submission" />
      </div>
      <ConsentField name="declaration" title="Applicant declaration" text="I confirm that the information provided is true, accurate and complete, and understand that misleading information may result in disqualification." register={register} error={errors.declaration?.message} />
      <ConsentField name="consent" title="Consent to verification" text="I consent to verification of the information and supporting documentation and agree to the applicable programme terms." register={register} error={errors.consent?.message} />
    </div>
  );
}

function Summary({ label, primary, secondary }: { label: string; primary: string; secondary: string }) {
  return <div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-2 font-bold text-navy">{primary}</p><p className="text-sm text-slate-500">{secondary}</p></div>;
}

function ConsentField({ name, title, text, register, error }: { name: "consent" | "declaration"; title: string; text: string; register: UseFormRegister<ApplicationValues>; error?: string }) {
  return (
    <div>
      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-5">
        <input type="checkbox" className="mt-1 size-4 accent-[#ff6f00]" {...register(name)} />
        <span className="text-sm leading-6 text-slate-600"><strong className="block text-navy">{title}</strong>{text}</span>
      </label>
      <FieldError message={error} />
    </div>
  );
}
