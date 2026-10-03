"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { FormSelect } from "@/components/ui/form-fields";
import type { WorkflowTaskAction } from "@/modules/work-queue/TaskTypes";
import type { ActionValues } from "./WorkflowTaskActionForm";

export function WorkflowTaskEscalationFields({
  action,
}: {
  action: WorkflowTaskAction;
}) {
  const form = useFormContext<ActionValues>();
  const targetType = useWatch({
    control: form.control,
    name: "escalationTargetType",
  });
  const targets = (action.requiredInput.escalationTargets ?? []).filter(
    (target) => target.targetType === targetType,
  );
  return (
    <>
      <FormSelect
        label="Escalate to"
        name="escalationTargetType"
        items={[
          { label: "Role", value: "ROLE" },
          { label: "Named user", value: "USER" },
        ]}
        onChange={(event) => {
          form.setValue(
            "escalationTargetType",
            event.currentTarget.value === "USER" ? "USER" : "ROLE",
          );
          form.setValue("escalationTargetId", "", { shouldValidate: true });
        }}
        required
      />
      <FormSelect
        label={targetType === "USER" ? "Destination user" : "Destination role"}
        name="escalationTargetId"
        placeholder="Choose a destination"
        items={targets.map((target) => ({
          label: target.label,
          value: target.id,
        }))}
        required
      />
    </>
  );
}
