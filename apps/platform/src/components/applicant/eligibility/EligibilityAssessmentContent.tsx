import { ArrowLeft, ArrowRight, LoaderCircle, RefreshCw } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { FormRadioCard } from "@/components/ui/form-radio-card";
import {
  StepProgress,
  type StepProgressItem,
} from "@/components/ui/step-progress";
import type {
  EligibilityAnswer,
  EligibilityAssessmentInput,
  EligibilityRuleSnapshot,
} from "@/modules/eligibility/EligibilityTypes";

const eligibilitySteps: StepProgressItem[] = [
  { id: "business", label: "Business" },
  { id: "operations", label: "Operations" },
  { id: "compliance", label: "Compliance" },
  { id: "readiness", label: "Readiness" },
  { id: "summary", label: "Summary" },
];

export function EligibilityStage({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  const index = Math.min(
    eligibilitySteps.length - 1,
    Math.floor(((current - 1) / total) * eligibilitySteps.length),
  );
  return (
    <div className="mt-8">
      <StepProgress
        ariaLabel={`Eligibility question ${current} of ${total}`}
        completedStepIds={eligibilitySteps
          .slice(0, index)
          .map((step) => step.id)}
        currentStepId={eligibilitySteps[index].id}
        hideLabelsOnMobile
        steps={eligibilitySteps}
      />
      <p className="mt-4 text-center text-xs font-semibold text-brand-navy/60 sm:hidden">
        Question {current} of {total}
      </p>
    </div>
  );
}

export function EligibilityQuestion({
  answer,
  current,
  form,
  rule,
  total,
}: {
  answer?: EligibilityAnswer;
  current: number;
  form: UseFormReturn<EligibilityAssessmentInput>;
  rule: EligibilityRuleSnapshot;
  total: number;
}) {
  return (
    <fieldset className="mt-8 rounded-2xl border border-brand-navy/15 bg-brand-white p-6 shadow-sm sm:p-8">
      <legend className="sr-only">{rule.question}</legend>
      <p className="text-xs font-bold uppercase tracking-wider text-brand-orange">
        Question {current} of {total}
      </p>
      <h2 className="mt-3 text-xl font-bold text-brand-navy sm:text-2xl">
        {rule.question}
      </h2>
      <p className="mt-2 text-sm leading-6 text-brand-navy/65">{rule.help}</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {(["yes", "no"] as const).map((value) => (
          <FormRadioCard
            checked={answer === value}
            key={value}
            label={value === "yes" ? "Yes" : "No"}
            value={value}
            {...form.register(`answers.${rule.id}`)}
          />
        ))}
      </div>
    </fieldset>
  );
}

export function EligibilityError({
  conflict,
  error,
  onRefresh,
}: {
  conflict: boolean;
  error?: Error | null;
  onRefresh: () => void;
}) {
  if (!error) return null;
  return (
    <div
      className="mt-4 rounded-xl border border-brand-navy bg-brand-cream p-4 text-sm text-brand-navy"
      role="alert"
    >
      <p className="font-semibold">{error.message}</p>
      {conflict ? (
        <Button
          className="mt-3"
          onClick={onRefresh}
          type="button"
          variant="outline"
        >
          <RefreshCw aria-hidden="true" className="size-4" />
          Load latest questions
        </Button>
      ) : null}
    </div>
  );
}

export function EligibilityActions({
  answer,
  current,
  lastQuestion,
  onNext,
  onPrevious,
  pending,
}: {
  answer?: EligibilityAnswer;
  current: number;
  lastQuestion: boolean;
  onNext: () => void;
  onPrevious: () => void;
  pending: boolean;
}) {
  return (
    <div className="mt-6 flex items-center justify-between">
      <Button
        disabled={current === 0 || pending}
        onClick={onPrevious}
        type="button"
        variant="ghost"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Previous
      </Button>
      <Button disabled={!answer || pending} onClick={onNext} type="button">
        {pending ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : null}
        {lastQuestion ? "See result" : "Next"}
        {!pending ? <ArrowRight aria-hidden="true" className="size-4" /> : null}
      </Button>
    </div>
  );
}
