import type { WorkflowActionDefinition } from "@/modules/workflows/domain/actions/WorkflowActionDefinition";

export const reviewOutcomes = [
  { code: "ACCEPT", label: "Accept" },
  { code: "RETURN", label: "Return for clarification" },
];

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
