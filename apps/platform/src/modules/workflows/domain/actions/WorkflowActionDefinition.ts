export const workflowActionTypes = [
  "APPROVE_ADVANCE",
  "REJECT",
  "REQUEST_INFORMATION",
  "RETURN",
  "REFER",
  "ESCALATE",
  "PUT_ON_HOLD",
  "WITHDRAW",
  "DEFER",
] as const;

export type WorkflowActionType = (typeof workflowActionTypes)[number];

export type WorkflowActionDefinition = {
  id?: string;
  stableKey: string;
  label: string;
  actionType: WorkflowActionType;
  enabled: boolean;
  reasonCodeRequired: boolean;
  displayOrder: number;
};
