"use client";

import { FormSelect } from "@/components/ui/form-fields";
import {
  formPurposeOptions,
  type FormPurpose,
} from "@/modules/forms/FormTypes";
import { workflowTaskFormPurposes } from "@/modules/workflows/domain/definitions/WorkflowTaskDefinition";

type Props = {
  formItems: { label: string; value: string }[];
  formPurpose: FormPurpose;
  formVersionId: string;
  formsPending: boolean;
};

export function WorkflowTaskFormLayoutStep({
  formItems,
  formPurpose,
  formVersionId,
  formsPending,
}: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormSelect
        items={formPurposeOptions.filter((item) =>
          workflowTaskFormPurposes.some((purpose) => purpose === item.value),
        )}
        label="Form purpose"
        name="formPurpose"
        required
      />
      {formPurpose === "ELIGIBILITY_VERIFICATION" ? (
        <div className="self-end rounded-xl border border-brand-navy/10 bg-brand-cream/50 p-4 text-sm text-slate-600">
          The eligibility form attached to the funding call is used when this
          task runs.
        </div>
      ) : (
        <FormSelect
          infoTooltip="Choose a published application review form."
          items={formItems}
          label="Form version"
          name="formVersionId"
          placeholder={formsPending ? "Loading forms…" : "No form selected"}
          value={formVersionId}
        />
      )}
      <FormSelect
        containerClassName="sm:col-span-2"
        infoTooltip="Controls how this task is presented to reviewers."
        items={[
          { label: "Step progress", value: "STEP_PROGRESS" },
          { label: "Collapsible sections", value: "SECTIONS" },
        ]}
        label="Task layout"
        name="displayMode"
        required
      />
    </div>
  );
}
