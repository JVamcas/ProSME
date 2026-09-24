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
  reviewerSlot: number;
  supersedesTaskId: string | null;
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
