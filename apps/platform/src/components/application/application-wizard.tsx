"use client";

import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { FormProvider } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { ApplicantStep } from "./applicant-step";
import {
  applicationStepCount,
  ApplicationProgress,
  applicationStepTitles,
} from "./application-progress";
import { BusinessStep } from "./business-step";
import { DocumentsStep } from "./documents-step";
import { FundingStep } from "./funding-step";
import { ReviewStep } from "./review-step";
import { useApplicationWizard } from "./use-application-wizard";

export function ApplicationWizard() {
  const wizard = useApplicationWizard();
  const { fillDemo, form, next, setStep, step, store, submit } = wizard;

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(submit)}
        className="card overflow-hidden"
      >
        <ApplicationProgress current={step} />
        <div className="p-6 sm:p-9">
          <StepHeader step={step} onFillDemo={fillDemo} />
          {step === 0 ? <ApplicantStep /> : null}
          {step === 1 ? <BusinessStep /> : null}
          {step === 2 ? <FundingStep /> : null}
          {step === 3 ? (
            <DocumentsStep
              documents={store.documents}
              onSelect={store.saveDocument}
            />
          ) : null}
          {step === 4 ? (
            <ReviewStep
              values={form.getValues()}
              documentCount={Object.keys(store.documents).length}
            />
          ) : null}
        </div>
        <WizardActions
          step={step}
          busy={form.formState.isSubmitting}
          onBack={() => setStep((value) => value - 1)}
          onNext={next}
        />
      </form>
    </FormProvider>
  );
}

function StepHeader({
  step,
  onFillDemo,
}: {
  step: number;
  onFillDemo: () => void;
}) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
      <div>
        <p className="eyebrow">
          Step {step + 1} of {applicationStepCount}
        </p>
        <h2 className="display mt-2 text-3xl font-semibold text-navy">
          {applicationStepTitles[step]}
        </h2>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={onFillDemo}>
        <Sparkles className="size-4" />
        Fill demo data
      </Button>
    </div>
  );
}

function WizardActions({
  step,
  busy,
  onBack,
  onNext,
}: {
  step: number;
  busy: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 p-5 sm:px-8">
      <Button
        type="button"
        variant="ghost"
        disabled={step === 0}
        onClick={onBack}
      >
        <ArrowLeft className="size-4" />
        Back
      </Button>
      {step < applicationStepCount - 1 ? (
        <Button type="button" variant="brand" onClick={onNext}>
          Save and continue <ArrowRight className="size-4" />
        </Button>
      ) : (
        <Button type="submit" variant="brand" disabled={busy}>
          Submit application <ArrowRight className="size-4" />
        </Button>
      )}
    </div>
  );
}
