export const workQueueScopes = ["mine", "overdue", "due-soon"] as const;

export type WorkQueueScope = (typeof workQueueScopes)[number];

export type WorkQueueInformationRequest = {
  id: string;
  status: "OPEN" | "RESPONDED" | "CLOSED" | "EXPIRED";
  createdAt: string;
  deadlineAt: string;
  respondedAt: string | null;
};

export type WorkQueueRow = {
  processingStatus?: "ON_HOLD" | null;
  holds?: import("@/modules/workflows/domain/runtime/WorkflowHold").WorkflowHoldSummary[];
  outgoingEscalation?: { id: string; canCancel: boolean } | null;
  applicantName: string;
  applicationId: string | null;
  assignedRoleId: string | null;
  assignedRoleName: string | null;
  assignedUserId: string | null;
  assignedUserName: string | null;
  businessName: string | null;
  claimedAt: string | null;
  createdAt: string;
  dueAt: string | null;
  fundingCallTitle: string | null;
  informationRequest?: WorkQueueInformationRequest | null;
  priority: "HIGH" | "MEDIUM" | "LOW" | null;
  reference: string;
  rowVersion: number;
  stageName: string;
  taskBlockedReason: string | null;
  taskDefinitionCode: string;
  taskInstanceId: string;
  taskName: string;
  taskStatus: string;
  taskType: "CONTRIBUTING" | "STAGE_DECISION";
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
