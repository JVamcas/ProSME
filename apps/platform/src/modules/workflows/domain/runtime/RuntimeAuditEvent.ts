export const runtimeAuditEventCodes = [
  "WORKFLOW_CREATED",
  "STAGE_ACTIVATED",
  "TASK_CREATED",
  "TASK_ASSIGNED",
  "TASK_STARTED",
  "TASK_COMPLETED",
  "ACTION_EXECUTED",
  "STAGE_COMPLETED",
  "TRANSITION_EXECUTED",
] as const;

export type RuntimeAuditEventCode =
  (typeof runtimeAuditEventCodes)[number];

export type RuntimeAuditEntry = {
  action: RuntimeAuditEventCode;
  actorId: string;
  after: Record<string, unknown> | null;
  before: Record<string, unknown> | null;
  correlationId: string;
  id: string;
  occurredAt: string;
  reason: string | null;
  sequence: number;
  stageInstanceId: string | null;
  taskId: string | null;
  workflowInstanceId: string;
};
