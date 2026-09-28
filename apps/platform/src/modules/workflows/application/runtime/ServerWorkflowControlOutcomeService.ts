import "server-only";

import type { WorkflowActionExecutionTransaction } from "../../infrastructure/WorkflowActionExecutionRepository";
import {
  hasActiveWorkflowReferral,
  recordWorkflowReferral,
  recordWorkflowRework,
  resumeWorkflowHold,
  startWorkflowHold,
} from "../../infrastructure/WorkflowControlRepository";
import { activateStageInTransaction } from "./ServerStageActivationService";
import { executeSequentialTransitionInTransaction } from "./ServerSequentialTransitionService";
import {
  buildExecutionResult,
  failWorkflowAction,
  persistActionAndDecision,
  type OutcomeExecution,
  type OutcomeInput,
  workflowTransitionResult,
} from "./WorkflowActionOutcomeSupport";

async function executeReturnOutcome(
  transaction: WorkflowActionExecutionTransaction,
  input: OutcomeInput,
  execution: OutcomeExecution,
) {
  if (
    input.target.action.actionType !== "RETURN"
    || input.command.input.actionType !== "RETURN"
  ) {
    failWorkflowAction("INVALID_RUNTIME_CONTEXT", "The return action is invalid.");
  }
  const transition = workflowTransitionResult(
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
      targetActivation: {
        iterationStrategy: "NEXT",
        returnContext: {
          actionExecutionId: execution.executionId,
          continuationStageInstanceId: input.command.sourceStageInstanceId,
          dataHandling: input.target.action.configuration.dataHandling,
          reason: input.command.input.reasonCode
            ?? input.command.input.comment
            ?? null,
          sourceStageInstanceId: input.command.sourceStageInstanceId,
          sourceTaskId: input.target.task?.id ?? null,
        },
      },
    }),
  );
  const targetStageInstanceId = transition.targets[0]?.targetStageInstanceId;
  if (
    transition.kind !== "STAGE_ACTIVATED"
    || transition.targets.length !== 1
    || !targetStageInstanceId
  ) {
    failWorkflowAction(
      "INVALID_RUNTIME_CONTEXT",
      "The return target could not be activated.",
    );
  }
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
    dataHandling: input.target.action.configuration.dataHandling,
    reason: input.command.input.reasonCode
      ?? input.command.input.comment
      ?? "No reason required by configuration.",
    sourceStageInstanceId: input.command.sourceStageInstanceId,
    sourceTaskId: input.target.task?.id ?? null,
    targetStageInstanceId,
    workflowInstanceId: input.target.stage.workflowInstanceId,
  });
  return result;
}

async function executeReferralOutcome(
  transaction: WorkflowActionExecutionTransaction,
  input: OutcomeInput,
  execution: OutcomeExecution,
) {
  if (
    input.target.action.actionType !== "REFER"
    || input.command.input.actionType !== "REFER"
    || !input.target.task
  ) {
    failWorkflowAction(
      "INVALID_RUNTIME_CONTEXT",
      "A referral requires a source task.",
    );
  }
  if (await hasActiveWorkflowReferral(transaction, input.target.task.id)) {
    failWorkflowAction(
      "ACTION_UNAVAILABLE",
      "This task already has an active referral.",
    );
  }
  const configured = input.configuredTransitions.transitions.find(
    (transition) => transition.id === input.conditions.selectedTransitionId,
  );
  const targetStage = configured?.targetStages[0];
  if (!configured || configured.targetStages.length !== 1 || !targetStage) {
    failWorkflowAction(
      "INVALID_RUNTIME_CONTEXT",
      "The referral target is not configured correctly.",
    );
  }
  const activation = await activateStageInTransaction(transaction, {
    actorId: input.actorId,
    correlationId: input.command.correlationId,
    iterationStrategy: "NEXT",
    referralContext: {
      actionExecutionId: execution.executionId,
      question: input.command.input.question,
      returnToReferrer: input.target.action.configuration.returnToReferrer,
      sourceStageInstanceId: input.command.sourceStageInstanceId,
      sourceTaskId: input.target.task.id,
    },
    stageDefinitionId: targetStage.id,
    workflowInstanceId: input.target.stage.workflowInstanceId,
  });
  if (activation.kind !== "activated") {
    failWorkflowAction(
      activation.kind === "entry_condition_failed"
        ? "CONDITION_FAILED"
        : "ACTION_UNAVAILABLE",
      "The referred work could not be activated.",
    );
  }
  const result = buildExecutionResult({
    ...execution,
    resultingRuntimeVersion: input.resultingRuntimeVersion,
    target: input.target,
    transition: {
      kind: "STAGE_ACTIVE",
      targets: [{
        outcome: "ACTIVATED",
        targetStageInstanceId: activation.stageInstanceId,
        targetStageName: targetStage.name,
      }],
      workflowStatus: "ACTIVE",
    },
  });
  await persistActionAndDecision(transaction, {
    ...input,
    ...execution,
    result,
    terminalOutcome: null,
  });
  await recordWorkflowReferral(transaction, {
    actionExecutionId: execution.executionId,
    actorId: input.actorId,
    correlationId: input.command.correlationId,
    question: input.command.input.question,
    referredStageInstanceId: activation.stageInstanceId,
    returnToReferrer: input.target.action.configuration.returnToReferrer,
    sourceStageInstanceId: input.command.sourceStageInstanceId,
    sourceTaskBehavior: input.target.action.configuration.sourceTaskBehavior,
    sourceTaskId: input.target.task.id,
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
    input.target.action.actionType !== "PUT_ON_HOLD"
    || input.command.input.actionType !== "PUT_ON_HOLD"
  ) return null;
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
  const hold = await startWorkflowHold(transaction, {
    actionExecutionId: execution.executionId,
    actorId: input.actorId,
    comment: input.command.input.comment,
    correlationId: input.command.correlationId,
    reasonCode: input.command.input.reasonCode,
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
    input.target.action.actionType !== "RESUME"
    || input.command.input.actionType !== "RESUME"
  ) return null;
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
  const hold = await resumeWorkflowHold(transaction, {
    actorId: input.actorId,
    comment: input.command.input.comment,
    correlationId: input.command.correlationId,
    stageInstanceId: input.command.sourceStageInstanceId,
    taskId: input.target.task?.id ?? null,
    workflowInstanceId: input.target.stage.workflowInstanceId,
  });
  if (!hold) {
    failWorkflowAction(
      "ACTION_UNAVAILABLE",
      "There is no active hold to resume.",
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
    case "REFER":
      return executeReferralOutcome(transaction, input, execution);
    case "PUT_ON_HOLD":
      return executeHoldOutcome(transaction, input, execution);
    case "RESUME":
      return executeResumeOutcome(transaction, input, execution);
    default:
      return null;
  }
}
