"use client";

import { useFormContext } from "react-hook-form";

import {
  FormInput,
  FormSelect,
  FormTextarea,
} from "@/components/ui/form-fields";
import { workflowPublicStatuses } from "@/modules/workflows/domain/definitions/WorkflowStageDefinition";
import { workflowApplicantStatusDefaults } from "../../domain/definitions/WorkflowApplicantStatusDefaults";
import type { WorkflowStageFormInput } from "./WorkflowStageFormSchema";

const applicantStatusItems = workflowPublicStatuses.map((status) => ({
  label: workflowApplicantStatusDefaults[status].label,
  value: status,
}));

export function WorkflowStageDetailsStep() {
  const form = useFormContext<WorkflowStageFormInput>();

  function fillApplicantStatusDefaults() {
    const status = form.getValues("publicStatusMapping.status");
    const defaults = workflowApplicantStatusDefaults[status];
    const options = { shouldDirty: true, shouldValidate: true };

    form.setValue("publicStatusMapping.label", defaults.label, options);
    form.setValue(
      "publicStatusMapping.description",
      defaults.description,
      options,
    );
  }

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
        label="Stage Description"
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
            Selecting a status fills in a suggested label and description that
            you can edit.
          </p>
        </div>
        <FormSelect
          items={applicantStatusItems}
          label="Applicant status"
          name="publicStatusMapping.status"
          registrationOptions={{ onChange: fillApplicantStatusDefaults }}
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
