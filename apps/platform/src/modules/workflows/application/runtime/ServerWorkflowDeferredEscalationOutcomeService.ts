import "server-only";

import type { WorkflowActionExecutionTransaction } from "../../infrastructure/WorkflowActionExecutionRepository";
import { startWorkflowDeferral } from "../../infrastructure/WorkflowDeferralRepository";
import { startWorkflowEscalation } from "../../infrastructure/WorkflowEscalationRepository";
import {
  buildExecutionResult,
  failWorkflowAction,
  persistActionAndDecision,
  type OutcomeExecution,
  type OutcomeInput,
} from "./WorkflowActionOutcomeSupport";

async function executeDeferralOutcome(
  transaction: WorkflowActionExecutionTransaction,
  input: OutcomeInput,
  execution: OutcomeExecution,
) {
  if (
    input.target.action.actionType !== "DEFER"
    || input.command.input.actionType !== "DEFER"
  ) return null;
  const configuration = input.target.action.configuration;
  const result = buildExecutionResult({
    ...execution,
    resultingRuntimeVersion: input.resultingRuntimeVersion,
    target: input.target,
    transition: { kind: "STAGE_BLOCKED", targets: [], workflowStatus: "ACTIVE" },
  });
  await persistActionAndDecision(transaction, {
    ...input,
    ...execution,
    result,
    terminalOutcome: null,
  });
  const deferral = await startWorkflowDeferral(transaction, {
    actionExecutionId: execution.executionId,
    actorId: input.actorId,
    comment: input.command.input.comment,
    continuation: configuration.continuation,
    correlationId: input.command.correlationId,
    mode: configuration.targetType,
    reasonCode: input.command.input.reasonCode,
    resumeAt: configuration.targetType === "DATE"
      ? new Date(`${configuration.targetDate}T00:00:00.000Z`)
      : undefined,
    stageInstanceId: input.command.sourceStageInstanceId,
    targetCallKey: configuration.targetType === "FUNDING_CALL"
      ? configuration.targetCallKey
      : undefined,
    taskId: input.target.task?.id ?? null,
    workflowInstanceId: input.target.stage.workflowInstanceId,
  });
  if (!deferral) {
    failWorkflowAction("ACTION_UNAVAILABLE", "The work could not be deferred.");
  }
  return result;
}

async function executeEscalationOutcome(
  transaction: WorkflowActionExecutionTransaction,
  input: OutcomeInput,
  execution: OutcomeExecution,
) {
  if (
    input.target.action.actionType !== "ESCALATE"
    || input.command.input.actionType !== "ESCALATE"
    || !input.target.task
  ) {
    if (input.target.action.actionType === "ESCALATE") {
      failWorkflowAction(
        "INVALID_RUNTIME_CONTEXT",
        "An escalation requires a source task.",
      );
    }
    return null;
  }
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
  const escalation = await startWorkflowEscalation(transaction, {
    actionExecutionId: execution.executionId,
    actorId: input.actorId,
    comment: input.command.input.comment,
    configuration: input.target.action.configuration,
    correlationId: input.command.correlationId,
    reasonCode: input.command.input.reasonCode,
    stageInstanceId: input.command.sourceStageInstanceId,
    taskId: input.target.task.id,
    workflowInstanceId: input.target.stage.workflowInstanceId,
  });
  if (!escalation) {
    failWorkflowAction(
      "ACTION_UNAVAILABLE",
      "The task could not be escalated.",
    );
  }
  return result;
}

export function executeDeferredEscalationOutcome(
  transaction: WorkflowActionExecutionTransaction,
  input: OutcomeInput,
  execution: OutcomeExecution,
) {
  return input.target.action.actionType === "DEFER"
    ? executeDeferralOutcome(transaction, input, execution)
    : executeEscalationOutcome(transaction, input, execution);
}
