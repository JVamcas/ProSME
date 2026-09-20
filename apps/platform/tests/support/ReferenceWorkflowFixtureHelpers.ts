import type { WorkflowActionDefinition } from "@/modules/workflows/domain/actions/WorkflowActionDefinition";

export const emptyStageConditions = {
  checklistItems: [],
  documentRequirements: [],
  commentFields: [],
  scoring: null,
  entryCondition: null,
  exitCondition: null,
};

export const reviewOutcomes = [
  { code: "ACCEPT", label: "Accept" },
  { code: "RETURN", label: "Return for clarification" },
];

export function referenceTaskDefaults(coiRequired: boolean) {
  return {
    assignmentMode: "ROLE" as const,
    coiRequired,
    displayOrder: 1,
    formBinding: null,
    quorum: false,
    required: true,
    requiredCompletionCount: 1,
    reviewerCount: 1,
  };
}

export function routingAction(
  stableKey: string,
  label: string,
): WorkflowActionDefinition {
  return {
    stableKey,
    label,
    actionType: "APPROVE_ADVANCE",
    configuration: {},
    enabled: true,
    reasonCodeRequired: false,
    displayOrder: 1,
  };
}
