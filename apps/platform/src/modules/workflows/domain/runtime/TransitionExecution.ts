import type { StageConditionEvaluation } from "../../engine/StageCondition";

export const transitionExecutionOutcomes = [
  "RECORDED",
  "TARGET_ACTIVATED",
  "TARGET_ENTRY_CONDITION_FAILED",
  "WORKFLOW_COMPLETED",
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
  targetStageDefinitionId: string | null;
  targetStageInstanceId: string | null;
  transitionDefinitionId: string;
  workflowInstanceId: string;
};
