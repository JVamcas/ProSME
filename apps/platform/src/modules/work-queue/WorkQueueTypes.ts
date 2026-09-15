export const workQueueScopes = ["mine", "overdue", "due-soon"] as const;

export type WorkQueueScope = (typeof workQueueScopes)[number];

export type WorkQueueRow = {
  applicantName: string;
  applicationId: string;
  assignedRoleId: string | null;
  assignedRoleName: string | null;
  assignedUserId: string | null;
  assignedUserName: string | null;
  businessName: string | null;
  claimedAt: string | null;
  dueAt: string | null;
  priority: "HIGH" | "MEDIUM" | "LOW" | null;
  reference: string;
  rowVersion: number;
  stageName: string;
  taskDefinitionCode: string;
  taskInstanceId: string;
  taskName: string;
  taskStatus: string;
  taskType: string;
};

export type WorkQueuePage = {
  items: WorkQueueRow[];
  nextCursor: string | null;
  total: number;
};

export type WorkQueueListInput = {
  after?: string;
  limit: number;
  search?: string;
  scope: WorkQueueScope;
};

export type TaskClaimResult = Pick<
  WorkQueueRow,
  | "assignedUserId"
  | "assignedUserName"
  | "claimedAt"
  | "rowVersion"
  | "taskInstanceId"
  | "taskStatus"
>;
