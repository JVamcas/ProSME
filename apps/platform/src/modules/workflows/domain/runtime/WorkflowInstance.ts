import type { WorkflowPublicStatusMapping } from "../definitions/WorkflowStageDefinition";

export const workflowInstanceStatuses = [
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
  "REJECTED",
] as const;

export type WorkflowInstanceStatus =
  (typeof workflowInstanceStatuses)[number];

export type WorkflowInstance = {
  id: string;
  applicationId: string;
  workflowTemplateVersionId: string;
  status: WorkflowInstanceStatus;
  terminalOutcome: string | null;
  publicStatus: WorkflowPublicStatusMapping | null;
  createdAt: Date;
  startedAt: Date;
  completedAt: Date | null;
};
