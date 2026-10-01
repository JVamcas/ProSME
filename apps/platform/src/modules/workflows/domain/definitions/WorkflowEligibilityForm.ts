type EligibilityFormTask = {
  stableKey: string;
  config?: unknown;
};

export function workflowTaskInheritsEligibilityForm(task: EligibilityFormTask) {
  const config = task.config as Record<string, unknown> | null;
  return task.stableKey === "ELIGIBILITY_VERIFICATION"
    || config?.formPurpose === "ELIGIBILITY_VERIFICATION"
    || config?.command === "AUTHORITATIVE_ELIGIBILITY";
}
