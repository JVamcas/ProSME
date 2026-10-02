"use client";

import { FormInput, FormSelect, FormTextarea } from "@/components/ui/form-fields";
import { workflowPublicStatuses } from "@/modules/workflows/domain/definitions/WorkflowStageDefinition";

const applicantStatusItems = workflowPublicStatuses.map((status) => ({
  label: status.charAt(0) + status.slice(1).toLowerCase().replaceAll("_", " "),
  value: status,
}));

export function WorkflowStageDetailsStep() {
  return (
    <section aria-label="Stage details" className="space-y-5">
      <div>
        <h3 className="text-base font-bold text-brand-navy">Stage details</h3>
        <p className="mt-1 text-sm text-brand-navy/60">
          Define what this stage represents and what should be accomplished
          before the workflow can move forward.
        </p>
      </div>
      <FormInput
        label="Stage name"
        name="name"
        placeholder="Finance review"
        required
      />
      <FormTextarea
        label="Description"
        name="description"
        placeholder="Describe what happens during this stage."
        rows={4}
      />
      <div className="space-y-5 border-t border-brand-navy/10 pt-5">
        <div>
          <h4 className="text-sm font-bold text-brand-navy">
            Applicant-facing status
          </h4>
          <p className="mt-1 text-sm text-brand-navy/60">
            Configure the status applicants see while this stage is active.
          </p>
        </div>
        <FormSelect
          items={applicantStatusItems}
          label="Applicant status"
          name="publicStatusMapping.status"
          required
        />
        <FormInput
          label="Applicant status label"
          name="publicStatusMapping.label"
          placeholder="Under review"
          maxLength={120}
          required
        />
        <FormTextarea
          label="Applicant status description"
          name="publicStatusMapping.description"
          placeholder="Your application is being reviewed."
          maxLength={300}
          required
          rows={3}
        />
      </div>
    </section>
  );
}
