"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { applicationDocuments, applicationStepFields } from "@/data/application-form";
import { applicationSchema, demoApplication, type ApplicationValues } from "@/data/application-schema";
import { useApplicationStore } from "@/store/application-store";
import { ApplicantStep } from "./applicant-step";
import { applicationStepCount, ApplicationProgress, applicationStepTitles } from "./application-progress";
import { BusinessStep } from "./business-step";
import { DocumentsStep } from "./documents-step";
import { FundingStep } from "./funding-step";
import { ReviewStep } from "./review-step";

export function ApplicationWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const store = useApplicationStore();
  const form = useForm<ApplicationValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: { ...store.application, declaration: store.application.declaration ?? false, consent: store.application.consent ?? false },
    mode: "onTouched",
  });

  useEffect(() => { void useApplicationStore.persist.rehydrate(); }, []);
  useEffect(() => {
    form.reset({ ...store.application, declaration: store.application.declaration ?? false, consent: store.application.consent ?? false });
  }, [form, store.application]);

  async function next() {
    if (!await form.trigger(applicationStepFields[step])) {
      toast.error("Please complete the highlighted fields");
      return;
    }
    store.saveApplication(form.getValues());
    setStep((value) => Math.min(value + 1, applicationStepCount - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function fillDemo() {
    form.reset(demoApplication);
    store.saveApplication(demoApplication);
    applicationDocuments.forEach(([key, label]) => store.saveDocument(key, `${label.replaceAll(" ", "-").toLowerCase()}.pdf`));
    toast.success("Demo application filled");
  }

  function submit(values: ApplicationValues) {
    store.submitApplication(values);
    toast.success("Application submitted");
    router.push("/portal/applications/new/confirmation");
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} className="card overflow-hidden">
      <ApplicationProgress current={step} />
      <div className="p-6 sm:p-9">
        <StepHeader step={step} onFillDemo={fillDemo} />
        {step === 0 ? <ApplicantStep register={form.register} errors={form.formState.errors} /> : null}
        {step === 1 ? <BusinessStep register={form.register} errors={form.formState.errors} /> : null}
        {step === 2 ? <FundingStep register={form.register} errors={form.formState.errors} /> : null}
        {step === 3 ? <DocumentsStep documents={store.documents} onSelect={store.saveDocument} /> : null}
        {step === 4 ? <ReviewStep values={form.getValues()} documentCount={Object.keys(store.documents).length} register={form.register} errors={form.formState.errors} /> : null}
      </div>
      <WizardActions step={step} busy={form.formState.isSubmitting} onBack={() => setStep((value) => value - 1)} onNext={next} />
    </form>
  );
}

function StepHeader({ step, onFillDemo }: { step: number; onFillDemo: () => void }) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
      <div><p className="eyebrow">Step {step + 1} of {applicationStepCount}</p><h2 className="display mt-2 text-3xl font-semibold text-navy">{applicationStepTitles[step]}</h2></div>
      <Button type="button" variant="outline" size="sm" onClick={onFillDemo}><Sparkles className="size-4" />Fill demo data</Button>
    </div>
  );
}

function WizardActions({ step, busy, onBack, onNext }: { step: number; busy: boolean; onBack: () => void; onNext: () => void }) {
  return (
    <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 p-5 sm:px-8">
      <Button type="button" variant="ghost" disabled={step === 0} onClick={onBack}><ArrowLeft className="size-4" />Back</Button>
      {step < applicationStepCount - 1
        ? <Button type="button" variant="gold" onClick={onNext}>Save and continue <ArrowRight className="size-4" /></Button>
        : <Button type="submit" variant="gold" disabled={busy}>Submit application <ArrowRight className="size-4" /></Button>}
    </div>
  );
}
