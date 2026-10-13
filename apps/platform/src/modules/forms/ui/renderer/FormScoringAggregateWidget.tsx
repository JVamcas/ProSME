"use client";

import { Label } from "@/shared/ui/FormPrimitives";
import type { WidgetProps } from "@rjsf/utils";

export function FormScoringAggregateWidget({
  id,
  label,
  value,
  options,
}: WidgetProps) {
  return (
    <div>
      <Label htmlFor={id} className="text-sm font-semibold">
        {label}
      </Label>
      <output
        id={id}
        className="block rounded-lg bg-brand-navy/5 p-3 font-semibold"
        aria-live="polite"
      >
        {typeof value === "number"
          ? `${value.toFixed(Number(options.precision ?? 2))}${options.percentage ? "%" : ""}`
          : "Awaiting scores"}
      </output>
    </div>
  );
}
