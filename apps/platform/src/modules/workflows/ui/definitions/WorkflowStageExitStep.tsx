"use client";

import { Controller, useFormContext } from "react-hook-form";

import type { ConditionFieldDefinition } from "@/modules/conditions/domain/ConditionConfiguration";
import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
import type { WorkflowStageFormInput } from "./WorkflowStageFormSchema";
import { WorkflowConditionEditor } from "./WorkflowConditionEditor";

type Props = {
  conditionFields: readonly ConditionFieldDefinition[];
  isPending: boolean;
};

export function WorkflowStageExitStep({
  conditionFields,
  isPending,
}: Props) {
  const form = useFormContext<WorkflowStageFormInput>();

  return (
    <section aria-label="Stage exit rules" className="space-y-5">
      <div>
        <h3 className="text-base font-bold text-brand-navy">Exit rules</h3>
        <p className="mt-1 text-sm text-brand-navy/60">
          Define the condition that must pass before this stage can complete.
        </p>
      </div>
      <Controller
        control={form.control}
        name="exitCondition"
        render={({ field }) => (
          <WorkflowConditionEditor
            fields={conditionFields}
            isPending={isPending}
            label="Stage exit condition"
            onChange={field.onChange}
            value={field.value as ConditionGroup | null}
          />
        )}
      />
    </section>
  );
}
