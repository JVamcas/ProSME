import "server-only";

import {
  WorkflowActionExecutionError,
  type WorkflowActionExecutionRequest,
  type WorkflowActionExecutionResult,
} from "../../domain/actions/WorkflowActionExecution";
import {
  recordWorkflowActionExecution,
  type WorkflowActionExecutionTarget,
  type WorkflowActionExecutionTransaction,
} from "../../infrastructure/WorkflowActionExecutionRepository";
import { recordWorkflowDecision } from "../../infrastructure/WorkflowDecisionRepository";
import {
  loadSequentialTransitions,
} from "../../infrastructure/TransitionExecutionRepository";
import { executeTerminalRejectInTransaction } from "./ServerRejectWorkflowActionService";
import { executeSequentialTransitionInTransaction } from "./ServerSequentialTransitionService";
import type { WorkflowActionConditionResult } from "./WorkflowActionPolicy";

export type ExecuteWorkflowActionInput = WorkflowActionExecutionRequest & {
  actionKey: string;
  correlationId: string;
  idempotencyKey: string;
  workflowInstanceId: string;
};

function fail(
  code: ConstructorParameters<typeof WorkflowActionExecutionError>[0],
  message: string,
): never {
  throw new WorkflowActionExecutionError(code, message);
}

function transitionResult(
  transition: Awaited<ReturnType<typeof executeSequentialTransitionInTransaction>>,
): WorkflowActionExecutionResult["transition"] {
  switch (transition.kind) {
    case "source_stage_not_completed":
      return {
        kind: "STAGE_ACTIVE",
        targetStageInstanceId: null,
        targetStageName: null,
        workflowStatus: "ACTIVE",
      };
    case "transitioned":
      return {
        kind: "STAGE_ACTIVATED",
        targetStageInstanceId: transition.targetStageInstanceId,
        targetStageName: transition.targetStageName,
        workflowStatus: transition.workflowStatus,
      };
    case "workflow_completed":
      return {
        kind: "WORKFLOW_COMPLETED",
        targetStageInstanceId: null,
        targetStageName: null,
        workflowStatus: transition.workflowStatus,
      };
    case "transition_not_found":
      return {
        kind: "NONE",
        targetStageInstanceId: null,
        targetStageName: null,
        workflowStatus: "ACTIVE",
      };
    case "transition_condition_failed":
    case "target_entry_condition_failed":
      return fail(
        "CONDITION_FAILED",
        "The configured action or transition conditions did not pass.",
      );
    default:
      return fail(
        "ACTION_UNAVAILABLE",
        "The configured action cannot execute from the current runtime state.",
      );
  }
}

function decisionOutcome(actionType: WorkflowActionExecutionResult["actionType"]) {
  if (actionType === "APPROVE_ADVANCE") return "APPROVED" as const;
  if (actionType === "REJECT") return "REJECTED" as const;
  return null;
}

function buildExecutionResult(input: {
  executedAt: string;
  executionId: string;
  resultingRuntimeVersion: number;
  target: WorkflowActionExecutionTarget;
  transition: WorkflowActionExecutionResult["transition"];
}): WorkflowActionExecutionResult {
  return {
    actionExecutionId: input.executionId,
    actionKey: input.target.action.stableKey,
    actionType: input.target.action.actionType,
    decisionId: decisionOutcome(input.target.action.actionType)
      ? crypto.randomUUID()
      : null,
    executedAt: input.executedAt,
    resultingRuntimeVersion: input.resultingRuntimeVersion,
    sourceStageInstanceId: input.target.stage.stageInstanceId,
    taskId: input.target.task?.id ?? null,
    transition: input.transition,
    workflowInstanceId: input.target.stage.workflowInstanceId,
  };
}

async function persistActionAndDecision(
  transaction: WorkflowActionExecutionTransaction,
  input: {
    actorId: string;
    conditions: WorkflowActionConditionResult;
    command: ExecuteWorkflowActionInput;
    executedAt: string;
    executionId: string;
    result: WorkflowActionExecutionResult;
    target: WorkflowActionExecutionTarget;
    terminalOutcome: string | null;
  },
) {
  await recordWorkflowActionExecution(transaction, {
    action: input.target.action,
    actorId: input.actorId,
    conditionEvaluation: {
      action: input.conditions.actionEvaluation,
      capturedAt: input.executedAt,
      transitions: input.conditions.transitionEvaluations,
    },
    correlationId: input.command.correlationId,
    expectedRuntimeVersion: input.command.expectedRuntimeVersion,
    id: input.executionId,
    idempotencyKey: input.command.idempotencyKey,
    normalizedInput: input.command.input,
    resolvedTarget: {
      kind: input.result.transition.kind,
      terminalOutcome: input.terminalOutcome,
      targetStageInstanceId: input.result.transition.targetStageInstanceId,
      targetStageName: input.result.transition.targetStageName,
    },
    result: input.result,
    resultingRuntimeVersion: input.result.resultingRuntimeVersion,
    sourceStageInstanceId: input.target.stage.stageInstanceId,
    taskBefore: input.target.task,
    taskId: input.target.task?.id ?? null,
    workflowInstanceId: input.target.stage.workflowInstanceId,
  });
  const outcome = decisionOutcome(input.target.action.actionType);
  if (!input.result.decisionId || !outcome) return;
  await recordWorkflowDecision(transaction, {
    actionDefinitionId: input.target.action.id,
    actionExecutionId: input.executionId,
    actionKey: input.target.action.stableKey,
    actorId: input.actorId,
    correlationId: input.command.correlationId,
    decidedAt: new Date(input.executedAt),
    decisionId: input.result.decisionId,
    normalizedInput: input.command.input,
    outcome,
    sourceStageInstanceId: input.target.stage.stageInstanceId,
    taskId: input.target.task?.id ?? null,
    workflowInstanceId: input.target.stage.workflowInstanceId,
  });
}

type OutcomeInput = {
  actorId: string;
  command: ExecuteWorkflowActionInput;
  conditions: WorkflowActionConditionResult;
  conditionContext: Parameters<
    typeof executeSequentialTransitionInTransaction
  >[1]["conditionContext"];
  configuredTransitions: Awaited<ReturnType<typeof loadSequentialTransitions>>;
  resultingRuntimeVersion: number;
  target: WorkflowActionExecutionTarget;
};

async function executeTerminalReject(
  transaction: WorkflowActionExecutionTransaction,
  input: OutcomeInput,
  transition: NonNullable<OutcomeInput["configuredTransitions"]["transitions"][number]>,
  execution: { executedAt: string; executionId: string },
) {
  if (!transition.terminalOutcome
    || input.target.action.actionType !== "REJECT"
    || input.target.action.configuration.outcome.type !== "TERMINAL") {
    fail("INVALID_RUNTIME_CONTEXT", "The terminal rejection is not configured correctly.");
  }
  const result = buildExecutionResult({
    ...execution,
    resultingRuntimeVersion: input.resultingRuntimeVersion
      + (input.target.action.configuration.outcome
          .cancelOpenStageInstances ? 1 : 0),
    target: input.target,
    transition: {
      kind: "WORKFLOW_REJECTED",
      targetStageInstanceId: null,
      targetStageName: null,
      workflowStatus: "REJECTED",
    },
  });
  await persistActionAndDecision(transaction, {
    ...input,
    ...execution,
    result,
    terminalOutcome: transition.terminalOutcome,
  });
  const evaluationIndex = input.configuredTransitions.transitions.findIndex(
    (item) => item.id === transition.id,
  );
  const rejection = await executeTerminalRejectInTransaction(transaction, {
    actionKey: input.command.actionKey,
    actorId: input.actorId,
    conditionEvaluation: input.conditions.transitionEvaluations[evaluationIndex]!,
    configuration: input.target.action.configuration.outcome,
    correlationId: input.command.correlationId,
    rejectedAt: new Date(execution.executedAt),
    sourceStageInstanceId: input.command.sourceStageInstanceId,
    transition,
    workflowInstanceId: input.target.stage.workflowInstanceId,
  });
  if (!rejection) {
    fail("ACTION_UNAVAILABLE", "The workflow changed before it could be rejected.");
  }
  return result;
}

export async function executeConfiguredWorkflowActionOutcome(
  transaction: WorkflowActionExecutionTransaction,
  input: OutcomeInput,
) {
  const execution = {
    executedAt: new Date().toISOString(),
    executionId: crypto.randomUUID(),
  };
  const configuredTransition = input.configuredTransitions.transitions.find(
    (transition) => transition.id === input.conditions.selectedTransitionId,
  ) ?? null;
  if (input.target.action.actionType === "REJECT"
    && input.target.action.configuration.outcome.type === "TERMINAL") {
    return executeTerminalReject(
      transaction,
      input,
      configuredTransition!,
      execution,
    );
  }
  if (input.target.action.actionType === "REJECT"
    && configuredTransition?.terminalOutcome) {
    fail("INVALID_RUNTIME_CONTEXT", "The rejection outcome does not match its transition.");
  }
  const transition = transitionResult(
    await executeSequentialTransitionInTransaction(transaction, {
      actionKey: input.command.actionKey,
      actorId: input.actorId,
      conditionSelection: {
        selectedTransitionId: input.conditions.selectedTransitionId,
        transitionEvaluations: input.conditions.transitionEvaluations,
      },
      conditionContext: input.conditionContext,
      correlationId: input.command.correlationId,
      sourceStageInstanceId: input.command.sourceStageInstanceId,
    }),
  );
  const result = buildExecutionResult({
    ...execution,
    resultingRuntimeVersion: input.resultingRuntimeVersion,
    target: input.target,
    transition,
  });
  await persistActionAndDecision(transaction, {
    ...input,
    ...execution,
    result,
    terminalOutcome: configuredTransition?.terminalOutcome ?? null,
  });
  return result;
}
