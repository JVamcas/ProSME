"use client";

import { Controller, useFormContext, useWatch } from "react-hook-form";

import { FormSelect } from "@/components/ui/form-fields";
import type { ConditionFieldDefinition } from "@/modules/conditions/domain/ConditionConfiguration";
import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
import type { WorkflowStageFormInput } from "./WorkflowStageFormSchema";
import { WorkflowConditionEditor } from "./WorkflowConditionEditor";

type Props = {
  conditionFields: readonly ConditionFieldDefinition[];
  isPending: boolean;
  predecessorItems: readonly { label: string; value: string }[];
};

export function WorkflowStageEntryStep({
  conditionFields,
  isPending,
  predecessorItems,
}: Props) {
  const form = useFormContext<WorkflowStageFormInput>();
  const predecessorKeys = useWatch({
    control: form.control,
    name: "joinPredecessorStageKeys",
  });

  return (
    <section aria-label="Stage entry rules" className="space-y-5">
      <div>
        <h3 className="text-base font-bold text-brand-navy">Entry rules</h3>
        <p className="mt-1 text-sm text-brand-navy/60">
          Define the prerequisites that must be satisfied before this stage can
          start.
        </p>
      </div>
      <FormSelect
        infoTooltip="This stage activates only after all selected predecessor stages are complete."
        items={predecessorItems}
        label="Join predecessors"
        multiple
        name="joinPredecessorStageKeys"
        onMultipleChange={(values) =>
          form.setValue("joinPredecessorStageKeys", values, {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
        placeholder="No join prerequisites"
        value={predecessorKeys}
      />
      <Controller
        control={form.control}
        name="entryCondition"
        render={({ field }) => (
          <WorkflowConditionEditor
            fields={conditionFields}
            isPending={isPending}
            label="Stage entry condition"
            onChange={field.onChange}
            value={field.value as ConditionGroup | null}
          />
        )}
      />
    </section>
  );
}
