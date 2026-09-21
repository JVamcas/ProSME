import type { TaskTypeCode } from "../definitions/WorkflowTypes";

export const workflowTaskStatuses = [
  "PENDING",
  "READY",
  "CLAIMED",
  "IN_PROGRESS",
  "BLOCKED",
  "COMPLETED",
  "SKIPPED",
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
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  dueAt: Date | null;
};
