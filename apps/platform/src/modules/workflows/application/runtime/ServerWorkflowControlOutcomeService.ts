import "server-only";

import type { WorkflowActionExecutionTransaction } from "../../infrastructure/WorkflowActionExecutionRepository";
import {
  recordWorkflowRework,
  resumeWorkflowHold,
  startWorkflowHold,
} from "../../infrastructure/WorkflowControlRepository";
import { resumeDueWorkflowDeferral } from "../../infrastructure/WorkflowDeferralRepository";
import { activateStageInTransaction } from "./ServerStageActivationService";
import { persistStageCompletion } from "../../infrastructure/StageCompletionRepository";
import {
  buildExecutionResult,
  failWorkflowAction,
  persistActionAndDecision,
  type OutcomeExecution,
  type OutcomeInput,
} from "./WorkflowActionOutcomeSupport";
import { executeDeferredEscalationOutcome } from "./ServerWorkflowDeferredEscalationOutcomeService";

async function executeReturnOutcome(
  transaction: WorkflowActionExecutionTransaction,
  input: OutcomeInput,
  execution: OutcomeExecution,
) {
  if (
    input.target.action.actionType !== "RETURN" ||
    input.command.input.actionType !== "RETURN"
  ) {
    failWorkflowAction(
      "INVALID_RUNTIME_CONTEXT",
      "The return action is invalid.",
    );
  }
  const targetStage = input.runtimeDestination;
  if (!targetStage) {
    failWorkflowAction("INVALID_ACTION_INPUT", "Choose a destination stage.");
  }
  const closed = await persistStageCompletion(transaction, {
    actorId: input.actorId,
    completedAt: new Date(),
    correlationId: input.command.correlationId,
    closure: "RETURN",
    requirements: [],
    target: input.target.stage,
  });
  if (!closed) {
    failWorkflowAction(
      "ACTION_UNAVAILABLE",
      "The return stage is no longer active.",
    );
  }
  const activation = await activateStageInTransaction(transaction, {
    actorId: input.actorId,
    correlationId: input.command.correlationId,
    iterationStrategy: "NEXT",
    returnContext: {
      actionExecutionId: execution.executionId,
      continuationStageInstanceId: input.command.sourceStageInstanceId,
      dataHandling:
        input.command.input.dataHandling ??
        input.target.action.configuration.dataHandling,
      reason: input.command.input.reason ?? input.command.input.comment ?? null,
      sourceStageInstanceId: input.command.sourceStageInstanceId,
      sourceTaskId: input.target.task?.id ?? null,
    },
    stageDefinitionId: targetStage.id,
    workflowInstanceId: input.target.stage.workflowInstanceId,
  });
  if (activation.kind !== "activated") {
    failWorkflowAction(
      activation.kind === "entry_condition_failed"
        ? "CONDITION_FAILED"
        : "ACTION_UNAVAILABLE",
      "The selected return stage could not be activated.",
    );
  }
  const targetStageInstanceId = activation.stageInstanceId;
  const transition = {
    kind: "STAGE_ACTIVATED" as const,
    targets: [
      {
        outcome: "ACTIVATED" as const,
        targetStageInstanceId,
        targetStageName: targetStage.name,
      },
    ],
    workflowStatus: "ACTIVE" as const,
  };
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
    terminalOutcome: null,
  });
  await recordWorkflowRework(transaction, {
    actionExecutionId: execution.executionId,
    actorId: input.actorId,
    continuationStageInstanceId: input.command.sourceStageInstanceId,
    correlationId: input.command.correlationId,
    dataHandling:
      input.command.input.dataHandling ??
      input.target.action.configuration.dataHandling,
    reason:
      input.command.input.reason ?? input.command.input.comment ?? undefined,
    sourceStageInstanceId: input.command.sourceStageInstanceId,
    sourceTaskId: input.target.task?.id ?? null,
    targetStageInstanceId,
    workflowInstanceId: input.target.stage.workflowInstanceId,
  });
  return result;
}

async function executeHoldOutcome(
  transaction: WorkflowActionExecutionTransaction,
  input: OutcomeInput,
  execution: OutcomeExecution,
) {
  if (
    input.target.action.actionType !== "PUT_ON_HOLD" ||
    input.command.input.actionType !== "PUT_ON_HOLD"
  )
    return null;
  const result = buildExecutionResult({
    ...execution,
    resultingRuntimeVersion: input.resultingRuntimeVersion,
    target: input.target,
    transition: {
      kind: "STAGE_BLOCKED",
      targets: [],
      workflowStatus: "ACTIVE",
    },
  });
  await persistActionAndDecision(transaction, {
    ...input,
    ...execution,
    result,
    terminalOutcome: null,
  });
  const hold = await startWorkflowHold(transaction, {
    actionExecutionId: execution.executionId,
    actorId: input.actorId,
    comment: input.command.input.comment,
    correlationId: input.command.correlationId,
    reason: input.command.input.reason,
    reviewAt: input.command.input.reviewDate
      ? new Date(`${input.command.input.reviewDate}T00:00:00.000Z`)
      : undefined,
    stageInstanceId: input.command.sourceStageInstanceId,
    taskId: input.target.task?.id ?? null,
    workflowInstanceId: input.target.stage.workflowInstanceId,
  });
  if (!hold) {
    failWorkflowAction(
      "ACTION_UNAVAILABLE",
      "The work could not be placed on hold.",
    );
  }
  return result;
}

async function executeResumeOutcome(
  transaction: WorkflowActionExecutionTransaction,
  input: OutcomeInput,
  execution: OutcomeExecution,
) {
  if (
    input.target.action.actionType !== "RESUME" ||
    input.command.input.actionType !== "RESUME"
  )
    return null;
  const result = buildExecutionResult({
    ...execution,
    resultingRuntimeVersion: input.resultingRuntimeVersion,
    target: input.target,
    transition: { kind: "STAGE_ACTIVE", targets: [], workflowStatus: "ACTIVE" },
  });
  await persistActionAndDecision(transaction, {
    ...input,
    ...execution,
    result,
    terminalOutcome: null,
  });
  const resumed = input.target.stage.activeDeferral
    ? await resumeDueWorkflowDeferral(transaction, {
        actionExecutionId: execution.executionId,
        actorId: input.actorId,
        correlationId: input.command.correlationId,
        resumedAt: new Date(execution.executedAt),
        stageInstanceId: input.command.sourceStageInstanceId,
        taskId: input.target.task?.id ?? null,
        workflowInstanceId: input.target.stage.workflowInstanceId,
      })
    : await resumeWorkflowHold(transaction, {
        actorId: input.actorId,
        comment: input.command.input.comment,
        correlationId: input.command.correlationId,
        stageInstanceId: input.command.sourceStageInstanceId,
        taskId: input.target.task?.id ?? null,
        workflowInstanceId: input.target.stage.workflowInstanceId,
      });
  if (!resumed) {
    failWorkflowAction(
      "ACTION_UNAVAILABLE",
      input.target.stage.activeDeferral
        ? "This deferral is not yet eligible to resume."
        : "There is no active hold to resume.",
    );
  }
  return result;
}

export function executeWorkflowControlOutcome(
  transaction: WorkflowActionExecutionTransaction,
  input: OutcomeInput,
  execution: OutcomeExecution,
) {
  switch (input.target.action.actionType) {
    case "RETURN":
      return executeReturnOutcome(transaction, input, execution);
    case "PUT_ON_HOLD":
      return executeHoldOutcome(transaction, input, execution);
    case "RESUME":
      return executeResumeOutcome(transaction, input, execution);
    case "DEFER":
    case "ESCALATE":
      return executeDeferredEscalationOutcome(transaction, input, execution);
    default:
      return null;
  }
}
