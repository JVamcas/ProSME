export const workflowInstanceStatuses = [
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
] as const;

export type WorkflowInstanceStatus =
  (typeof workflowInstanceStatuses)[number];

export type WorkflowInstance = {
  id: string;
  applicationId: string;
  workflowTemplateVersionId: string;
  status: WorkflowInstanceStatus;
  createdAt: Date;
  startedAt: Date;
  completedAt: Date | null;
};
