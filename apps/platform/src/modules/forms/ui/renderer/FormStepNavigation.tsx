"use client";

import { GeneralButton } from "@/components/ui/button";
import type { RenderSection } from "@/modules/forms/engine/FormDefinitionParser";

export function FormStepProgress({
  currentIndex,
  sections,
}: {
  currentIndex: number;
  sections: RenderSection[];
}) {
  return (
    <nav aria-label="Form steps" className="space-y-2">
      <p className="text-sm font-semibold text-brand-navy">
        Step {currentIndex + 1} of {sections.length}: {sections[currentIndex].title}
      </p>
      <ol className="flex gap-2" role="list">
        {sections.map((section, index) => (
          <li className="flex-1" key={section.id}>
            <span
              aria-current={index === currentIndex ? "step" : undefined}
              className={
                index <= currentIndex
                  ? "block h-2 rounded-full bg-brand-orange"
                  : "block h-2 rounded-full bg-brand-navy/10"
              }
            >
              <span className="sr-only">{section.title}</span>
            </span>
          </li>
        ))}
      </ol>
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
