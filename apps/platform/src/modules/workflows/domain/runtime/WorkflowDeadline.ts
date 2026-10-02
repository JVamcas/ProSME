export const workflowDeadlineKinds = [
  "SLA_BREACH",
  "RFI_REMINDER",
  "RFI_EXPIRED",
  "DEFERRAL_RESUMED",
  "HOLD_REVIEW",
] as const;

export type WorkflowDeadlineKind = (typeof workflowDeadlineKinds)[number];

export type WorkflowDeadlineCandidate = {
  kind: WorkflowDeadlineKind;
  occurrenceKey: string;
  scheduledFor: Date;
  sourceId: string;
  stageInstanceId: string;
  taskId: string | null;
  workflowInstanceId: string;
};

export type WorkflowDeadlineBatchResult = {
  claimed: number;
  failed: number;
  processed: number;
  skipped: number;
};
