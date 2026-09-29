import { ArrowRight, Check } from "lucide-react";

import { cn } from "@/lib/utils";

const steps = ["Choose a call", "Check eligibility", "Apply"];

export function ApplicantJourney({ step }: { step: 1 | 2 | 3 }) {
  return (
    <ol
      aria-label="Application journey"
      className="my-8 flex items-start justify-between gap-2 sm:items-center sm:gap-5"
    >
      {steps.map((label, index) => {
        const number = index + 1;
        const complete = number < step;
        const current = number === step;
        return (
          <li
            aria-current={current ? "step" : undefined}
            className="flex flex-1 items-center gap-2 sm:gap-5 last:flex-none"
            key={label}
          >
            <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:text-left">
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-full border text-sm font-bold sm:size-10",
                  current
                    ? "border-brand-orange bg-brand-orange text-white"
                    : "border-brand-blue/25 bg-brand-blue/10 text-brand-navy/65",
                )}
              >
                {complete ? <Check aria-hidden className="size-4" /> : number}
              </span>
              <span
                className={cn(
                  "text-xs font-semibold sm:text-sm",
                  current ? "text-brand-orange" : "text-brand-navy/65",
                )}
              >
                {label}
                {complete ? <span className="sr-only"> (complete)</span> : null}
              </span>
            </div>
            {number < steps.length ? (
              <ArrowRight
                aria-hidden
                className="mx-auto size-4 shrink-0 text-brand-navy/40"
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
