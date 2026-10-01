"use client";

import type { WorkflowTaskInput } from "@/modules/workflows/domain/definitions/WorkflowTypes";

export function workflowTaskInheritsEligibilityForm(task: WorkflowTaskInput) {
  const config = task.config as Record<string, unknown> | null;
  return config?.formPurpose === "ELIGIBILITY_VERIFICATION"
    || config?.command === "AUTHORITATIVE_ELIGIBILITY";
}

export function WorkflowTaskEligibilityPreview() {
  return (
    <p className="text-sm text-slate-600">
      This task uses the verification form generated from the eligibility ruleset
      version attached to the funding call. The questions depend on that funding
      call and are available when reviewing an application. This workflow
      template preview has no funding call selected.
    </p>
  );
}
