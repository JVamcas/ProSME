import "server-only";

import type { RejectConfiguration } from "../../domain/actions/WorkflowActionConfiguration";
import type { StageConditionEvaluation } from "../../engine/StageCondition";
import type { WorkflowActionExecutionTransaction } from "../../infrastructure/WorkflowActionExecutionRepository";
import {
  finalizeTransitionExecution,
  recordTransitionExecution,
  type SequentialTransition,
} from "../../infrastructure/TransitionExecutionRepository";
import {
  rejectTerminalWorkflow,
  type TerminalRejectionResult,
} from "../../infrastructure/WorkflowRejectionRepository";

type TerminalConfiguration = Extract<
  RejectConfiguration["outcome"],
  { type: "TERMINAL" }
>;

export type TerminalRejectResult = TerminalRejectionResult & {
  transitionExecutionId: string;
};

export async function executeTerminalRejectInTransaction(
  transaction: WorkflowActionExecutionTransaction,
  input: {
    actionKey: string;
    actorId: string;
    conditionEvaluation: StageConditionEvaluation;
    configuration: TerminalConfiguration;
    correlationId: string;
    rejectedAt: Date;
    sourceStageInstanceId: string;
    transition: SequentialTransition;
    workflowInstanceId: string;
  },
): Promise<TerminalRejectResult | null> {
  if (!input.transition.terminalOutcome) return null;
  const execution = await recordTransitionExecution(transaction, {
    actionKey: input.actionKey,
    actorId: input.actorId,
    conditionEvaluation: input.conditionEvaluation,
    correlationId: input.correlationId,
    sourceStageInstanceId: input.sourceStageInstanceId,
    transition: input.transition,
    workflowInstanceId: input.workflowInstanceId,
  });
  const rejection = await rejectTerminalWorkflow(transaction, {
    actorId: input.actorId,
    configuration: input.configuration,
    correlationId: input.correlationId,
    rejectedAt: input.rejectedAt,
    sourceStageInstanceId: input.sourceStageInstanceId,
    terminalOutcome: input.transition.terminalOutcome,
    workflowInstanceId: input.workflowInstanceId,
  });
  if (!rejection) return null;
  await finalizeTransitionExecution(transaction, {
    actionKey: input.actionKey,
    actorId: input.actorId,
    correlationId: input.correlationId,
    executionId: execution.id,
    outcome: "WORKFLOW_REJECTED",
    sourceStageInstanceId: input.sourceStageInstanceId,
    targetStageInstanceId: null,
    transition: input.transition,
    workflowInstanceId: input.workflowInstanceId,
  });
  return { ...rejection, transitionExecutionId: execution.id };
}
