"use client";

import { FormSelect } from "@/components/ui/form-fields";
import { FormDateTimeInput } from "@/shared/ui/FormDateTimeInput";
import type { WorkflowTaskAction } from "@/modules/work-queue/TaskTypes";
import { workflowHoldScopeLabels } from "../../domain/runtime/WorkflowHold";

export function WorkflowTaskHoldFields({
  action,
}: {
  action: WorkflowTaskAction;
}) {
  if (action.actionType === "PUT_ON_HOLD") {
    return (
      <>
        <FormSelect
          label="Hold scope"
          name="holdScope"
          items={(action.requiredInput.holdScopes ?? []).map((scope) => ({
            value: scope,
            label: workflowHoldScopeLabels[scope],
          }))}
          required
        />
        <FormDateTimeInput
          label="Review date and time"
          name="reviewDate"
          required={action.requiredInput.reviewDate.required}
        />
      </>
    );
  }
  if (
    action.actionType === "RESUME" &&
    action.requiredInput.resumableHolds?.length
  ) {
    return (
      <FormSelect
        label="Hold to resume"
        name="holdId"
        placeholder="Choose a hold"
        items={action.requiredInput.resumableHolds.map((hold) => ({
          value: hold.id,
          label: `${workflowHoldScopeLabels[hold.scope]} — ${hold.heldBy}${hold.reason ? `: ${hold.reason}` : ""}`,
        }))}
        required
      />
    );
  }
  return null;
}
