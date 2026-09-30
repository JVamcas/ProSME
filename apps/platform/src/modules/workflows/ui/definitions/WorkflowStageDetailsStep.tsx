"use client";

import { FormInput, FormTextarea } from "@/components/ui/form-fields";

export function WorkflowStageDetailsStep() {
  return (
    <section aria-label="Stage details" className="space-y-5">
      <div>
        <h3 className="text-base font-bold text-brand-navy">Stage details</h3>
        <p className="mt-1 text-sm text-brand-navy/60">
          Define what this stage represents and what should be accomplished before the workflow can move forward.</p>
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
    </section>
  );
}
