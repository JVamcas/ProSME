"use client";

import { Check } from "lucide-react";
import { Button } from "react-aria-components";

import { cn } from "@/lib/utils";

export type StepProgressItem<TId extends string = string> = {
  disabled?: boolean;
  id: TId;
  label: string;
};

type StepProgressProps<TId extends string> = {
  ariaLabel?: string;
  className?: string;
  completedStepIds?: readonly TId[];
  currentStepId: TId;
  disabled?: boolean;
  hideLabelsOnMobile?: boolean;
  onStepChange?: (id: TId, index: number) => void | Promise<void>;
  steps: readonly StepProgressItem<TId>[];
};

type StepState = "complete" | "current" | "not complete" | "unavailable";

function markerClassName(state: StepState) {
  if (state === "complete") {
    return "border-brand-green bg-brand-green/40 text-brand-navy";
  }
  if (state === "current") {
    return "border-brand-orange bg-brand-orange text-brand-navy";
  }
  return "border-brand-navy/20 bg-brand-white text-brand-navy/60";
}

function stepState(
  complete: boolean,
  current: boolean,
  unavailable: boolean,
): StepState {
  if (unavailable) return "unavailable";
  if (complete) return "complete";
  return current ? "current" : "not complete";
}

type ProgressStepProps<TId extends string> = {
  complete: boolean;
  current: boolean;
  disabled: boolean;
  hideLabel: boolean;
  index: number;
  onChange?: (id: TId, index: number) => void | Promise<void>;
  step: StepProgressItem<TId>;
  total: number;
};

function StepConnector({ complete }: { complete: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "absolute left-1/2 top-[1.375rem] h-px w-full",
        complete ? "bg-brand-green" : "bg-brand-navy/20",
      )}
    />
  );
}

function ProgressStep<TId extends string>({
  complete,
  current,
  disabled,
  hideLabel,
  index,
  onChange,
  step,
  total,
}: ProgressStepProps<TId>) {
  const state = stepState(complete, current, Boolean(step.disabled));
  const inactive = disabled || current || step.disabled || !onChange;
  return (
    <li className="relative flex min-w-24 flex-1 justify-center">
      {index < total - 1 ? <StepConnector complete={complete} /> : null}
      <Button
        aria-current={current ? "step" : undefined}
        aria-label={`${step.label}, ${state}`}
        className={({ isFocusVisible }) =>
          cn(
            "group relative z-10 flex min-w-0 flex-col items-center gap-2 rounded-md outline-none",
            inactive ? "cursor-default" : "cursor-pointer",
            isFocusVisible && "ring-2 ring-brand-orange ring-offset-2",
          )
        }
        isDisabled={inactive}
        onPress={() => onChange?.(step.id, index)}
      >
        <span
          className={cn(
            "grid size-11 place-items-center rounded-full border-2 text-xs font-bold transition-colors",
            markerClassName(state),
            !inactive &&
              "group-hover:border-brand-orange group-hover:text-brand-navy",
          )}
        >
          {complete ? (
            <Check aria-hidden="true" className="size-4" />
          ) : (
            index + 1
          )}
        </span>
        <span
          className={cn(
            "whitespace-nowrap text-xs font-semibold",
            hideLabel && "hidden sm:block",
            current ? "text-brand-orange" : "text-brand-navy/65",
          )}
        >
          {step.label}
        </span>
      </Button>
    </li>
  );
}

export function StepProgress<TId extends string>({
  ariaLabel = "Progress",
  className,
  completedStepIds = [],
  currentStepId,
  disabled = false,
  hideLabelsOnMobile = false,
  onStepChange,
  steps,
}: StepProgressProps<TId>) {
  const completed = new Set(completedStepIds);
  return (
    <nav
      aria-label={ariaLabel}
      className={cn("w-full overflow-x-auto", className)}
    >
      <ol className="flex min-w-max items-start sm:min-w-full">
        {steps.map((step, index) => (
          <ProgressStep
            complete={completed.has(step.id)}
            current={step.id === currentStepId}
            disabled={disabled}
            hideLabel={hideLabelsOnMobile}
            index={index}
            key={step.id}
            onChange={onStepChange}
            step={step}
            total={steps.length}
          />
        ))}
      </ol>
    </nav>
  );
}
