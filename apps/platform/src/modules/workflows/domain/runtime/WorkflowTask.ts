import type { TaskTypeCode } from "../definitions/WorkflowTypes";

export const workflowTaskStatuses = [
  "PENDING",
  "CLAIMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;

export type WorkflowTaskStatus = (typeof workflowTaskStatuses)[number];

export type WorkflowTask = {
  id: string;
  stageInstanceId: string;
  workflowTaskDefinitionId: string;
  typeSnapshot: TaskTypeCode;
  formVersionId: string | null;
  assignedRoleId: string | null;
  assignedUserId: string | null;
  status: WorkflowTaskStatus;
  rowVersion: number;
  createdAt: Date;
  claimedAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  dueAt: Date | null;
};
