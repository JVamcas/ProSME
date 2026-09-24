export const stageInstanceStatuses = [
  "NOT_STARTED",
  "ACTIVE",
  "BLOCKED",
  "COMPLETED",
  "CANCELLED",
] as const;

export type StageInstanceStatus = (typeof stageInstanceStatuses)[number];

export type StageRuntimeContext = Record<string, unknown>;

export type StageInstance = {
  id: string;
  workflowInstanceId: string;
  workflowStageDefinitionId: string;
  status: StageInstanceStatus;
  iterationNumber: number;
  rowVersion: number;
  referralContext: StageRuntimeContext | null;
  returnContext: StageRuntimeContext | null;
  activatedAt: Date;
  completedAt: Date | null;
};
