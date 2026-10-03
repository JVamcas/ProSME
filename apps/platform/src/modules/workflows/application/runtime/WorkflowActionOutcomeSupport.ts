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
import { resolveActiveWorkflowEscalation } from "../../infrastructure/WorkflowEscalationRepository";
import { loadSequentialTransitions } from "../../infrastructure/TransitionExecutionRepository";
import { executeSequentialTransitionInTransaction } from "./ServerSequentialTransitionService";
import type { WorkflowActionConditionResult } from "./WorkflowActionPolicy";

export type ExecuteWorkflowActionInput = WorkflowActionExecutionRequest & {
  actionKey: string;
  correlationId: string;
  idempotencyKey: string;
  workflowInstanceId: string;
};

export type OutcomeInput = {
  actorId: string;
  command: ExecuteWorkflowActionInput;
  conditions: WorkflowActionConditionResult;
  conditionContext: Parameters<
    typeof executeSequentialTransitionInTransaction
  >[1]["conditionContext"];
  configuredTransitions: Awaited<ReturnType<typeof loadSequentialTransitions>>;
  resultingRuntimeVersion: number;
  runtimeDestination?: { id: string; name: string } | null;
  requestInformation?: { requestInformationId: string } | null;
  target: WorkflowActionExecutionTarget;
};

export type OutcomeExecution = {
  executedAt: string;
  executionId: string;
};

export function failWorkflowAction(
  code: ConstructorParameters<typeof WorkflowActionExecutionError>[0],
  message: string,
): never {
  throw new WorkflowActionExecutionError(code, message);
}

export function workflowTransitionResult(
  transition: Awaited<
    ReturnType<typeof executeSequentialTransitionInTransaction>
  >,
): WorkflowActionExecutionResult["transition"] {
  switch (transition.kind) {
    case "source_stage_not_completed":
      return failWorkflowAction(
        "ACTION_UNAVAILABLE",
        "Complete the remaining required stage work before this decision.",
      );
    case "transitioned":
      if (
        transition.targets.every(
          (target) => target.outcome === "ENTRY_CONDITION_FAILED",
        )
      ) {
        return failWorkflowAction(
          "CONDITION_FAILED",
          "The configured target entry conditions did not pass.",
        );
      }
      return {
        kind: transition.targets.every(
          (target) => target.outcome === "JOIN_PENDING",
        )
          ? "JOIN_PENDING"
          : "STAGE_ACTIVATED",
        targets: transition.targets.map((target) => ({
          outcome: target.outcome,
          targetStageInstanceId: target.targetStageInstanceId,
          targetStageName: target.targetStageName,
        })),
        workflowStatus: transition.workflowStatus,
      };
    case "workflow_completed":
      return {
        kind: "WORKFLOW_COMPLETED",
        targets: [],
        workflowStatus: transition.workflowStatus,
      };
    case "transition_not_found":
      return { kind: "NONE", targets: [], workflowStatus: "ACTIVE" };
    case "transition_condition_failed":
      return failWorkflowAction(
        "CONDITION_FAILED",
        "The configured action or transition conditions did not pass.",
      );
    default:
      return failWorkflowAction(
        "ACTION_UNAVAILABLE",
        "The configured action cannot execute from the current runtime state.",
      );
  }
}

function decisionOutcome(
  actionType: WorkflowActionExecutionResult["actionType"],
) {
  if (actionType === "APPROVE_ADVANCE") return "APPROVED" as const;
  if (actionType === "REJECT") return "REJECTED" as const;
  return null;
}

export function buildExecutionResult(
  input: OutcomeExecution & {
    resultingRuntimeVersion: number;
    target: WorkflowActionExecutionTarget;
    transition: WorkflowActionExecutionResult["transition"];
  },
): WorkflowActionExecutionResult {
  return {
    actionExecutionId: input.executionId,
    actionKey: input.target.action.stableKey,
    actionType: input.target.action.actionType,
    decisionId: decisionOutcome(input.target.action.actionType)
      ? crypto.randomUUID()
      : null,
    executedAt: input.executedAt,
    requestInformationId: null,
    resultingRuntimeVersion: input.resultingRuntimeVersion,
    sourceStageInstanceId: input.target.stage.stageInstanceId,
    taskId: input.target.task?.id ?? null,
    transition: input.transition,
    workflowInstanceId: input.target.stage.workflowInstanceId,
  };
}

export async function persistActionAndDecision(
  transaction: WorkflowActionExecutionTransaction,
  input: OutcomeInput &
    OutcomeExecution & {
      result: WorkflowActionExecutionResult;
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
      requestInformationId: input.result.requestInformationId,
      targets: input.result.transition.targets,
      terminalOutcome: input.terminalOutcome,
    },
    result: input.result,
    resultingRuntimeVersion: input.result.resultingRuntimeVersion,
    sourceStageInstanceId: input.target.stage.stageInstanceId,
    taskBefore: input.target.task,
    taskId: input.target.task?.id ?? null,
    workflowInstanceId: input.target.stage.workflowInstanceId,
  });
  if (
    input.target.task &&
    input.target.action.actionType !== "ESCALATE" &&
    input.target.task.activeEscalation &&
    (input.result.decisionId !== null ||
      input.result.transition.kind === "STAGE_ACTIVATED")
  ) {
    await resolveActiveWorkflowEscalation(transaction, {
      actorId: input.actorId,
      correlationId: input.command.correlationId,
      resolutionActionExecutionId: input.executionId,
      stageInstanceId: input.target.stage.stageInstanceId,
      taskId: input.target.task.id,
      workflowInstanceId: input.target.stage.workflowInstanceId,
    });
  }
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
