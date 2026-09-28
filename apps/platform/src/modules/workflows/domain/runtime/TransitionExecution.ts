import type { StageConditionEvaluation } from "../../engine/StageCondition";

export const transitionExecutionOutcomes = [
  "RECORDED",
  "TARGET_ACTIVATED",
  "TARGET_ENTRY_CONDITION_FAILED",
  "TARGET_JOIN_PENDING",
  "WORKFLOW_COMPLETED",
  "WORKFLOW_REJECTED",
] as const;

export type TransitionExecutionOutcome =
  (typeof transitionExecutionOutcomes)[number];

export type TransitionExecution = {
  actionKey: string;
  actorId: string;
  conditionEvaluation: StageConditionEvaluation;
  correlationId: string;
  executedAt: Date;
  id: string;
  outcome: TransitionExecutionOutcome;
  sourceStageInstanceId: string;
  targets: TransitionExecutionTarget[];
  transitionDefinitionId: string;
  workflowInstanceId: string;
};

export type TransitionExecutionTarget = {
  outcome: "ACTIVATED" | "ALREADY_ACTIVE" | "ENTRY_CONDITION_FAILED" | "JOIN_PENDING";
  targetStageDefinitionId: string;
  targetStageInstanceId: string | null;
};
