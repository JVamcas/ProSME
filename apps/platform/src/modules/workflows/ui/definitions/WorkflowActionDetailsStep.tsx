"use client";

import { CheckboxField } from "@/components/ui/form-field";
import { FormInput, FormSelect } from "@/components/ui/form-fields";
import { workflowActionTypeItems } from "@/modules/workflows/ui/definitions/WorkflowActionFormSchema";

export function WorkflowActionDetailsStep() {
  return (
    <fieldset className="grid gap-4 sm:grid-cols-1">
      <legend className="sr-only">Action details</legend>
      <FormInput
        label="Action Button label"
        name="label"
        placeholder="Approve review"
        required
      />
      <FormSelect
        items={workflowActionTypeItems}
        label="Action type"
        name="actionType"
        required
      />
      <FormInput
        label="Display order"
        min={1}
        name="displayOrder"
        registrationOptions={{ valueAsNumber: true }}
        required
        type="number"
      />
      <CheckboxField label="Require a reason" name="reasonRequired" />
      <CheckboxField label="Enabled" name="enabled" />
    </fieldset>
  );
}
