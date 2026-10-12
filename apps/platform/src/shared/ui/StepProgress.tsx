"use client";

import type { ComponentType, ReactNode } from "react";
import { Check } from "lucide-react";
import { Button } from "react-aria-components";

import { cn } from "@/lib/utils";

export type StepProgressItem<TId extends string = string> = {
  disabled?: boolean;
  id: TId;
  label: string;
};

export type StepProgressContainerProps = {
  children: ReactNode;
  className: string;
  id: string;
};

function DefaultStepContainer({ children, className }: StepProgressContainerProps) {
  return <li className={className}>{children}</li>;
}

export type StepProgressProps<TId extends string> = {
  StepContainer?: ComponentType<StepProgressContainerProps>;
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
    return "border-brand-green bg-brand-green-soft text-brand-navy";
  }
  if (state === "current") {
    return "border-brand-orange bg-brand-orange text-brand-white";
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
  StepContainer: ComponentType<StepProgressContainerProps>;
  complete: boolean;
  current: boolean;
  disabled: boolean;
  hideLabel: boolean;
  index: number;
  onChange?: (id: TId, index: number) => void | Promise<void>;
  previousComplete: boolean;
  step: StepProgressItem<TId>;
  total: number;
};

function StepConnector({
  complete,
  side,
}: {
  complete: boolean;
  side: "before" | "after";
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "absolute top-[1.375rem] h-px w-1/2",
        side === "before" ? "left-0" : "right-0",
        complete ? "bg-brand-green" : "bg-brand-navy/20",
      )}
    />
  );
}

function ProgressStep<TId extends string>({
  StepContainer,
  complete,
  current,
  disabled,
  hideLabel,
  index,
  onChange,
  previousComplete,
  step,
  total,
}: ProgressStepProps<TId>) {
  const state = stepState(complete, current, Boolean(step.disabled));
  const inactive = disabled || current || step.disabled || !onChange;
  return (
    <StepContainer
      id={step.id}
      className="relative flex min-w-max flex-[1_0_auto] justify-center px-4"
    >
      {index > 0 ? (
        <StepConnector complete={previousComplete} side="before" />
      ) : null}
      {index < total - 1 ? (
        <StepConnector complete={complete} side="after" />
      ) : null}
      <Button
        aria-current={current ? "step" : undefined}
        aria-label={`${step.label}, ${state}`}
        className={({ isFocusVisible }) =>
          cn(
            "group relative z-10 flex shrink-0 flex-col items-center gap-2 rounded-md outline-none",
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
            !inactive && state !== "complete" &&
              "group-hover:border-brand-orange group-hover:text-brand-navy",
            !inactive && state === "complete" &&
              "group-hover:ring-2 group-hover:ring-brand-green/30",
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
    </StepContainer>
  );
}

export function StepProgress<TId extends string>({
  StepContainer = DefaultStepContainer,
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
      className={cn("w-full min-w-0 max-w-full overflow-x-auto pb-2", className)}
    >
      <ol className="flex w-max min-w-full items-start">
        {steps.map((step, index) => (
          <ProgressStep
            StepContainer={StepContainer}
            complete={completed.has(step.id)}
            current={step.id === currentStepId}
            disabled={disabled}
            hideLabel={hideLabelsOnMobile}
            index={index}
            key={step.id}
            onChange={onStepChange}
            previousComplete={index > 0 && completed.has(steps[index - 1].id)}
            step={step}
            total={steps.length}
          />
        ))}
      </ol>
    </nav>
  );
}
