"use client";

import { useFormContext, useWatch } from "react-hook-form";

import { FormSelect } from "@/components/ui/form-fields";
import type { WorkflowStageInput } from "../../domain/definitions/WorkflowTypes";
import type { WorkflowTransitionFormValues } from "./WorkflowTransitionFormSchema";

type Props = {
  isReturn: boolean;
  stages: WorkflowStageInput[];
};

export function WorkflowRouteStageField({ isReturn, stages }: Props) {
  const form = useFormContext<WorkflowTransitionFormValues>();
  const targetStageKeys = useWatch({
    control: form.control,
    name: "targetStageKeys",
  });

  return (
    <FormSelect
      containerClassName="sm:col-span-2"
      items={stages.map((stage) => ({
        label: stage.name,
        value: stage.stableKey,
      }))}
      label={isReturn ? "Previous stage" : "Target stages"}
      multiple={!isReturn}
      name="targetStageKeys"
      registrationOptions={
        isReturn
          ? {
              // Native single-select reads on blur must retain the route's array.
              setValueAs: (value: string | string[]) => {
                if (Array.isArray(value)) return value;
                return value ? [value] : [];
              },
            }
          : undefined
      }
      onChange={(event) => {
        const keys = event.target.value ? [event.target.value] : [];
        form.setValue("targetStageKeys", keys, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }}
      onMultipleChange={(values) =>
        form.setValue("targetStageKeys", values, {
          shouldDirty: true,
          shouldValidate: true,
        })
      }
      placeholder={
        isReturn ? "Select the previous stage" : "Select one or more stages"
      }
      required
      value={isReturn ? (targetStageKeys[0] ?? "") : targetStageKeys}
    />
  );
}
