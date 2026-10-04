"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { GeneralButton } from "@/components/ui/button";
import { StepProgress } from "@/components/ui/step-progress";
import {
  fundingCallCreateSchema,
  type FundingCallCreateInput,
} from "../api/FundingCallSchemas";
import type {
  FundingCallCreationProgressView,
  FundingCallView,
} from "../api/FundingCallTransport";
import {
  fundingCallSteps,
  type FundingCallStepId,
} from "./FundingCallFormSteps";
import {
  createPublicIdentifiers,
  defaults,
  draftValues,
  firstInvalidStep,
  localFormSchema,
  stepFields,
  type LocalFormInput,
  type LocalFormOutput,
} from "./FundingCallFormSchema";
import { FundingCallFormSection } from "./FundingCallFormSection";
import { FundingCallSaveStatus } from "./FundingCallSaveStatus";
import { useFundingCallCreationAutosave } from "./useFundingCallCreationAutosave";

export function FundingCallForm({
  call,
  creationProgress,
  disabled = false,
  onSubmit,
}: {
  call?: FundingCallView;
  creationProgress?: FundingCallCreationProgressView;
  disabled?: boolean;
  onSubmit: (input: FundingCallCreateInput) => Promise<void>;
}) {
  const creationAutosaveEnabled = !call;
  const [currentStep, setCurrentStep] = useState<FundingCallStepId>(
    creationProgress?.currentStep ?? "basics",
  );
  const [completedSteps, setCompletedSteps] = useState<FundingCallStepId[]>([]);
  const form = useForm<LocalFormInput, unknown, LocalFormOutput>({
    defaultValues: defaults(call, creationProgress),
    resolver: zodResolver(localFormSchema),
  });
  const watchedValues = useWatch({ control: form.control }) as LocalFormInput;
  const autosave = useFundingCallCreationAutosave({
    currentStep,
    enabled: creationAutosaveEnabled,
    initialProgress: creationProgress,
    values: draftValues(watchedValues),
  });

  const submit = form.handleSubmit(
    async (values) => {
      if (creationAutosaveEnabled && autosave.status !== "saved") {
        toast.error("Wait for the latest changes to finish saving.");
        return;
      }
      try {
        const identifiers = call
          ? { reference: call.reference, slug: call.slug }
          : createPublicIdentifiers(values.title);
        const input = fundingCallCreateSchema.parse({
          ...values,
          closesAt: new Date(values.closesAt).toISOString(),
          ...identifiers,
          opensAt: new Date(values.opensAt).toISOString(),
        });
        await onSubmit(input);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to save the funding call.",
        );
      }
    },
    (errors) => {
      setCurrentStep(firstInvalidStep(errors));
      toast.error("Review the highlighted fields before saving the Draft.");
    },
  );
  const currentIndex = fundingCallSteps.findIndex(
    (step) => step.id === currentStep,
  );

  async function continueToNextStep() {
    if (currentStep === "review") return;
    const valid = await form.trigger(stepFields[currentStep], {
      shouldFocus: true,
    });
    if (!valid) return;
    setCompletedSteps((current) =>
      current.includes(currentStep) ? current : [...current, currentStep],
    );
    setCurrentStep(fundingCallSteps[currentIndex + 1].id);
  }

  return (
    <FormProvider {...form}>
      <form className="w-full" onSubmit={submit}>
        <div className="overflow-hidden rounded-t-2xl border border-brand-navy/15 bg-white shadow-sm">
          <StepProgress
            ariaLabel="Funding call sections"
            className="border-b border-brand-navy/10 px-5 py-5"
            completedStepIds={completedSteps}
            currentStepId={currentStep}
            disabled={form.formState.isSubmitting}
            hideLabelsOnMobile
            onStepChange={setCurrentStep}
            steps={fundingCallSteps}
          />
          <fieldset
            className="grid min-h-96 gap-4 p-5 sm:p-8 md:grid-cols-2"
            disabled={disabled}
          >
            <FundingCallFormSection
              call={call}
              currentStep={currentStep}
              disabled={disabled}
            />
          </fieldset>
          <div className="flex items-center justify-between border-t border-brand-navy/10 px-5 py-4 sm:px-8">
            <div className="flex flex-wrap items-center gap-4">
              <GeneralButton
                disabled={currentIndex === 0 || form.formState.isSubmitting}
                onClick={() =>
                  setCurrentStep(fundingCallSteps[currentIndex - 1].id)
                }
                type="button"
                variant="outline"
              >
                Back
              </GeneralButton>
              <FundingCallSaveStatus
                enabled={creationAutosaveEnabled}
                error={autosave.error}
                onRetry={autosave.retry}
                status={autosave.status}
              />
            </div>
            {currentStep === "review" ? (
              <GeneralButton
                disabled={
                  disabled ||
                  form.formState.isSubmitting ||
                  (creationAutosaveEnabled && autosave.status !== "saved")
                }
                type="submit"
              >
                {form.formState.isSubmitting ? "Saving…" : "Save Draft"}
              </GeneralButton>
            ) : (
              <GeneralButton
                disabled={form.formState.isSubmitting}
                onClick={() => void continueToNextStep()}
                type="button"
              >
                Continue
              </GeneralButton>
            )}
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
