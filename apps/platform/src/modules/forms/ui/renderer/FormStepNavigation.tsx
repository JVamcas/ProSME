"use client";

import { GeneralButton } from "@/components/ui/button";
import { StepProgress } from "@/components/ui/step-progress";

export function FormStepProgress({
  completedStepIds,
  currentIndex,
  onStepChange,
  steps,
}: {
  completedStepIds: readonly string[];
  currentIndex: number;
  onStepChange: (stepId: string) => void;
  steps: { id: string; title: string }[];
}) {
  const currentStep = steps[currentIndex];
  if (!currentStep) return null;

  return (
    <nav aria-label="Form steps" className="space-y-2">
      <p className="text-sm font-semibold text-brand-navy">
        Step {currentIndex + 1} of {steps.length}: {currentStep.title}
      </p>
      <StepProgress
        ariaLabel="Application form steps"
        completedStepIds={completedStepIds}
        currentStepId={currentStep.id}
        hideLabelsOnMobile
        onStepChange={onStepChange}
        steps={steps.map((step) => ({
          disabled:
            step.id !== currentStep.id
            && !completedStepIds.includes(step.id),
          id: step.id,
          label: step.title,
        }))}
      />
    </nav>
  );
}

export function FormStepActions({
  currentIndex,
  onBack,
  onNext,
  stepCount,
}: {
  currentIndex: number;
  onBack: () => void;
  onNext: () => void;
  stepCount: number;
}) {
  const isLastStep = currentIndex === stepCount - 1;
  if (stepCount < 2 || isLastStep && currentIndex === 0) return null;
  return (
    <div className="mt-6 flex justify-between border-t border-brand-navy/10 pt-5">
      <GeneralButton
        disabled={currentIndex === 0}
        onClick={onBack}
        type="button"
        variant="outline"
      >
        Back
      </GeneralButton>
      {!isLastStep ? (
        <GeneralButton onClick={onNext} type="button">
          Next
        </GeneralButton>
      ) : null}
    </div>
  );
}
