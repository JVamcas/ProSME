"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type FieldPath } from "react-hook-form";
import { ArrowLeft, ArrowRight, Building2, Check, FileText, HandCoins, Paperclip, Sparkles, UserRound } from "lucide-react";
import { toast } from "sonner";
import { applicationSchema, demoApplication, type ApplicationValues } from "@/data/application-schema";
import { useApplicationStore } from "@/store/application-store";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/form-controls";

const steps = [
  { title: "Applicant", icon: UserRound },
  { title: "Business", icon: Building2 },
  { title: "Funding", icon: HandCoins },
  { title: "Documents", icon: Paperclip },
  { title: "Review", icon: FileText },
];

const stepFields: FieldPath<ApplicationValues>[][] = [
  ["firstName", "lastName", "email", "phone", "gender", "age", "nationality"],
  ["businessName", "registrationNumber", "position", "yearsOperating", "annualTurnover", "employees", "sector", "region", "exportReady"],
  ["amountRequested", "useOfFunds", "expectedOutcomes", "jobs"],
  [],
  ["declaration", "consent"],
];

const documents = [
  ["bipa", "BIPA business registration"], ["namra", "NAMRA Good Standing Certificate"],
  ["ssc", "Social Security Good Standing Certificate"], ["msme", "Valid MSME Certificate"],
  ["police", "Police clearance or proof of application"], ["bank", "Bank confirmation letter or statement"],
  ["profile", "Business profile (maximum 5 pages)"], ["pitch", "Pitch deck (maximum 12 slides)"],
] as const;

const regions = ["Erongo", "Hardap", "//Kharas", "Kavango East", "Kavango West", "Khomas", "Kunene", "Ohangwena", "Omaheke", "Omusati", "Oshana", "Oshikoto", "Otjozondjupa", "Zambezi"];

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <div><Label>{label}</Label>{children}<FieldError message={error} /></div>;
}

export function ApplicationWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const { application, documents: storedDocuments, saveApplication, saveDocument, submitApplication } = useApplicationStore();
  const { register, handleSubmit, trigger, getValues, reset, formState: { errors, isSubmitting } } = useForm<ApplicationValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: { ...application, declaration: application.declaration ?? false, consent: application.consent ?? false },
    mode: "onTouched",
  });

  useEffect(() => { void useApplicationStore.persist.rehydrate(); }, []);
  useEffect(() => { reset({ ...application, declaration: application.declaration ?? false, consent: application.consent ?? false }); }, [application, reset]);

  async function next() {
    const valid = await trigger(stepFields[step]);
    if (!valid) { toast.error("Please complete the highlighted fields"); return; }
    saveApplication(getValues());
    setStep(value => Math.min(value + 1, steps.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function fillDemo() {
    reset(demoApplication);
    saveApplication(demoApplication);
    documents.forEach(([key, label]) => saveDocument(key, `${label.replaceAll(" ", "-").toLowerCase()}.pdf`));
    toast.success("Demo application filled");
  }

  function submit(values: ApplicationValues) {
    submitApplication(values);
    toast.success("Application submitted");
    router.push("/apply/confirmation");
  }

  const values = getValues();
  return <form onSubmit={handleSubmit(submit)} className="card overflow-hidden">
    <div className="border-b border-slate-200 bg-slate-50 px-5 py-5 sm:px-8"><div className="flex items-center justify-between gap-5 overflow-x-auto">{steps.map(({title,icon:Icon},i)=><div key={title} className={`flex min-w-fit items-center gap-2 text-xs font-bold ${i === step ? "text-navy" : i < step ? "text-emerald-700" : "text-slate-400"}`}><span className={`grid size-8 place-items-center rounded-full ${i === step ? "bg-navy text-white" : i < step ? "bg-emerald-100" : "bg-white border border-slate-200"}`}>{i < step ? <Check className="size-4"/> : <Icon className="size-4"/>}</span><span className="hidden sm:block">{title}</span></div>)}</div><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-orange transition-all" style={{width:`${((step+1)/steps.length)*100}%`}}/></div></div>
    <div className="p-6 sm:p-9">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="eyebrow">Step {step + 1} of {steps.length}</p><h2 className="display mt-2 text-3xl font-semibold text-navy">{["Tell us about yourself", "Tell us about the business", "Your funding request", "Supporting documents", "Review and declare"][step]}</h2></div><Button type="button" variant="outline" size="sm" onClick={fillDemo}><Sparkles className="size-4"/>Fill demo data</Button></div>

      {step === 0 && <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="First name" error={errors.firstName?.message}><Input {...register("firstName")} placeholder="e.g. Selma" /></FormField>
        <FormField label="Surname" error={errors.lastName?.message}><Input {...register("lastName")} placeholder="e.g. Nghidinwa" /></FormField>
        <FormField label="Email address" error={errors.email?.message}><Input type="email" {...register("email")} placeholder="name@example.com" /></FormField>
        <FormField label="Contact number" error={errors.phone?.message}><Input {...register("phone")} placeholder="+264" /></FormField>
        <FormField label="Gender" error={errors.gender?.message}><Select {...register("gender")}><option value="">Select</option><option>Female</option><option>Male</option><option>Prefer not to say</option></Select></FormField>
        <FormField label="Age" error={errors.age?.message}><Input type="number" {...register("age", { valueAsNumber: true })} /></FormField>
        <FormField label="Nationality" error={errors.nationality?.message}><Input {...register("nationality")} placeholder="e.g. Namibian" /></FormField>
      </div>}

      {step === 1 && <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Registered business name" error={errors.businessName?.message}><Input {...register("businessName")} /></FormField>
        <FormField label="Registration number" error={errors.registrationNumber?.message}><Input {...register("registrationNumber")} /></FormField>
        <FormField label="Your position" error={errors.position?.message}><Input {...register("position")} placeholder="e.g. Managing member" /></FormField>
        <FormField label="Years in operation" error={errors.yearsOperating?.message}><Select {...register("yearsOperating")}><option value="">Select</option><option>1–2 years</option><option>2–3 years</option><option>3–5 years</option><option>More than 5 years</option></Select></FormField>
        <FormField label="Annual turnover" error={errors.annualTurnover?.message}><Select {...register("annualTurnover")}><option value="">Select range</option><option>Up to N$250,000</option><option>N$250,001–N$500,000</option><option>N$500,001–N$1,000,000</option><option>Above N$1,000,000</option></Select></FormField>
        <FormField label="Current employees" error={errors.employees?.message}><Input type="number" min="0" {...register("employees", { valueAsNumber: true })} /></FormField>
        <FormField label="Primary sector" error={errors.sector?.message}><Select {...register("sector")}><option value="">Select sector</option><option>Agro-processing</option><option>Agriculture</option><option>Manufacturing</option><option>Tourism</option><option>Technology</option><option>Renewable energy</option><option>Creative industries</option><option>Other</option></Select></FormField>
        <FormField label="Region of operation" error={errors.region?.message}><Select {...register("region")}><option value="">Select region</option>{regions.map(r=><option key={r}>{r}</option>)}</Select></FormField>
        <div className="sm:col-span-2"><FormField label="Export or market expansion readiness" error={errors.exportReady?.message}><Select {...register("exportReady")}><option value="">Select</option><option>Ready to expand locally</option><option>Preparing for regional export</option><option>Already exporting</option><option>Seeking investment opportunities</option></Select></FormField></div>
      </div>}

      {step === 2 && <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Amount requested (N$)" error={errors.amountRequested?.message}><Input type="number" min="50000" max="100000" step="1000" {...register("amountRequested", { valueAsNumber: true })} /></FormField>
        <FormField label="Jobs expected to be created" error={errors.jobs?.message}><Input type="number" min="0" {...register("jobs", { valueAsNumber: true })} /></FormField>
        <div className="sm:col-span-2"><FormField label="How will the funding be used?" error={errors.useOfFunds?.message}><Textarea {...register("useOfFunds")} placeholder="Describe the specific investment and why it is needed..." /></FormField></div>
        <div className="sm:col-span-2"><FormField label="What outcomes do you expect?" error={errors.expectedOutcomes?.message}><Textarea {...register("expectedOutcomes")} placeholder="Describe measurable growth, productivity, market or employment outcomes..." /></FormField></div>
      </div>}

      {step === 3 && <div><div className="rounded-2xl border border-orange/30 bg-orange-pale p-5 text-sm leading-6 text-slate-600"><strong className="text-navy">Demo upload:</strong> Files are represented by name and remain on this device. No document is sent to a server.</div><div className="mt-6 grid gap-3">{documents.map(([key,label])=><label key={key} className="flex cursor-pointer items-center gap-4 rounded-2xl border border-slate-200 p-4 transition hover:border-orange"><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${storedDocuments[key] ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{storedDocuments[key] ? <Check className="size-5"/> : <Paperclip className="size-5"/>}</span><span className="min-w-0 flex-1"><strong className="block text-sm text-navy">{label}</strong><span className="block truncate text-xs text-slate-400">{storedDocuments[key] || "Choose PDF file"}</span></span><input className="sr-only" type="file" accept="application/pdf" onChange={e => { const file=e.target.files?.[0]; if(file) saveDocument(key,file.name); }} /></label>)}</div></div>}

      {step === 4 && <div className="grid gap-6">
        <div className="grid gap-4 rounded-2xl bg-slate-50 p-5 sm:grid-cols-2"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Applicant</p><p className="mt-2 font-bold text-navy">{values.firstName} {values.lastName}</p><p className="text-sm text-slate-500">{values.email}</p></div><div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Business</p><p className="mt-2 font-bold text-navy">{values.businessName}</p><p className="text-sm text-slate-500">{values.sector} · {values.region}</p></div><div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Funding request</p><p className="mt-2 font-bold text-navy">N${Number(values.amountRequested || 0).toLocaleString("en-NA")}</p><p className="text-sm text-slate-500">{values.jobs || 0} expected new jobs</p></div><div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Documents selected</p><p className="mt-2 font-bold text-navy">{Object.keys(storedDocuments).length} of {documents.length}</p><p className="text-sm text-slate-500">Verification follows submission</p></div></div>
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-5"><input type="checkbox" className="mt-1 size-4 accent-[#ff6f00]" {...register("declaration")} /><span className="text-sm leading-6 text-slate-600"><strong className="block text-navy">Applicant declaration</strong>I confirm that the information provided is true, accurate and complete, and understand that misleading information may result in disqualification.</span></label><FieldError message={errors.declaration?.message}/>
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-5"><input type="checkbox" className="mt-1 size-4 accent-[#ff6f00]" {...register("consent")} /><span className="text-sm leading-6 text-slate-600"><strong className="block text-navy">Consent to verification</strong>I consent to verification of the information and supporting documentation and agree to the applicable programme terms.</span></label><FieldError message={errors.consent?.message}/>
      </div>}
    </div>
    <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 p-5 sm:px-8"><Button type="button" variant="ghost" disabled={step===0} onClick={()=>setStep(s=>s-1)}><ArrowLeft className="size-4"/>Back</Button>{step < steps.length-1 ? <Button type="button" variant="gold" onClick={next}>Save and continue <ArrowRight className="size-4"/></Button> : <Button type="submit" variant="gold" disabled={isSubmitting}>Submit application <ArrowRight className="size-4"/></Button>}</div>
  </form>;
}
