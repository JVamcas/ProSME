export const workflowPublicStatuses = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "ACTION_REQUIRED",
  "OUTCOME_AVAILABLE",
  "CLOSED",
  "WITHDRAWN",
] as const;

export type WorkflowPublicStatus = (typeof workflowPublicStatuses)[number];

export type WorkflowPublicStatusMapping = {
  status: WorkflowPublicStatus;
  label: string;
  description: string;
};

export type WorkflowStageDefinition = {
  id?: string;
  stableKey: string;
  name: string;
  description: string;
  enabled: boolean;
  optional: boolean;
  displayOrder: number;
  publicStatusMapping: WorkflowPublicStatusMapping;
  repeatable: boolean;
  coiGated: boolean;
};
