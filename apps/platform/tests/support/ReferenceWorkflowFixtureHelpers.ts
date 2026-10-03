import type { WorkflowActionDefinition } from "@/modules/workflows/domain/actions/WorkflowActionDefinition";
import { defaultWorkflowElementPermissions } from "@/modules/workflows/domain/definitions/WorkflowElementPermissions";

export const emptyStageConditions = {
  checklistItems: [],
  documentRequirements: [],
  scoring: null,
  entryCondition: null,
  exitCondition: null,
  joinPredecessorStageKeys: [],
};

export const reviewOutcomes = [
  { code: "ACCEPT", label: "Accept" },
  { code: "RETURN", label: "Return for clarification" },
];

export function referenceTaskDefaults() {
  return {
    assignmentMode: "ROLE" as const,
    displayOrder: 1,
    formBinding: null,
    permissions: defaultWorkflowElementPermissions,
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
    reasonRequired: false,
    displayOrder: 1,
  };
}
