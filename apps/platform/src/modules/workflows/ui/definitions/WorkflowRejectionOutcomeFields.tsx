"use client";

import {
  FormInput,
  FormSelect,
  FormTextarea,
} from "@/components/ui/form-fields";

export function WorkflowRejectionOutcomeFields() {
  return (
    <fieldset className="grid gap-4 border-t border-brand-navy/10 pt-4 sm:grid-cols-2">
      <legend className="text-sm font-bold text-brand-navy">
        Terminal rejection settings
      </legend>
      <p className="sm:col-span-2 text-sm text-brand-navy/70">
        Terminal rejection cancels all open stages and tasks.
      </p>
      <FormSelect
        items={[
          { label: "Outcome available", value: "OUTCOME_AVAILABLE" },
          { label: "Closed", value: "CLOSED" },
        ]}
        label="Applicant status"
        name="rejectionPublicStatus"
        required
      />
      <FormInput
        label="Applicant status label"
        name="rejectionPublicLabel"
        required
      />
      <FormTextarea
        containerClassName="sm:col-span-2"
        label="Applicant status description"
        name="rejectionPublicDescription"
        required
        rows={2}
      />
    </fieldset>
  );
}
