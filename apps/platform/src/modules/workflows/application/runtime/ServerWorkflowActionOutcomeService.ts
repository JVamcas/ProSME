import "server-only";

import { withdrawFromWorkflowAction } from "@/modules/applications/ServerApplicationWithdrawalService";

import { type WorkflowActionExecutionTransaction } from "../../infrastructure/WorkflowActionExecutionRepository";
import { executeTerminalRejectInTransaction } from "./ServerRejectWorkflowActionService";
import { executeSequentialTransitionInTransaction } from "./ServerSequentialTransitionService";
import {
  buildExecutionResult,
  failWorkflowAction as fail,
  persistActionAndDecision,
  type OutcomeInput,
  workflowTransitionResult as transitionResult,
} from "./WorkflowActionOutcomeSupport";
import { executeWorkflowControlOutcome } from "./ServerWorkflowControlOutcomeService";

export type { ExecuteWorkflowActionInput } from "./WorkflowActionOutcomeSupport";

async function executeTerminalReject(
  transaction: WorkflowActionExecutionTransaction,
  input: OutcomeInput,
  transition: NonNullable<
    OutcomeInput["configuredTransitions"]["transitions"][number]
  >,
  execution: { executedAt: string; executionId: string },
) {
  if (
    !transition.terminalOutcome ||
    input.target.action.actionType !== "REJECT" ||
    input.target.action.configuration.outcome.type !== "TERMINAL"
  ) {
    fail(
      "INVALID_RUNTIME_CONTEXT",
      "The terminal rejection is not configured correctly.",
    );
  }
  const result = buildExecutionResult({
    ...execution,
    resultingRuntimeVersion: input.resultingRuntimeVersion + 1,
    target: input.target,
    transition: {
      kind: "WORKFLOW_REJECTED",
      targets: [],
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
    conditionEvaluation:
      input.conditions.transitionEvaluations[evaluationIndex]!,
    configuration: input.target.action.configuration.outcome,
    correlationId: input.command.correlationId,
    rejectedAt: new Date(execution.executedAt),
    sourceStageInstanceId: input.command.sourceStageInstanceId,
    transition,
    workflowInstanceId: input.target.stage.workflowInstanceId,
  });
  if (!rejection) {
    fail(
      "ACTION_UNAVAILABLE",
      "The workflow changed before it could be rejected.",
    );
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
  const configuredTransition =
    input.configuredTransitions.transitions.find(
      (transition) => transition.id === input.conditions.selectedTransitionId,
    ) ?? null;
  const controlOutcome = await executeWorkflowControlOutcome(
    transaction,
    input,
    execution,
  );
  if (controlOutcome) return controlOutcome;
  if (input.target.action.actionType === "REQUEST_INFORMATION") {
    if (!input.requestInformation) {
      fail(
        "INVALID_RUNTIME_CONTEXT",
        "The information request was not created for this action.",
      );
    }
    const result = {
      ...buildExecutionResult({
        ...execution,
        resultingRuntimeVersion: input.resultingRuntimeVersion,
        target: input.target,
        transition: {
          kind: "STAGE_ACTIVE" as const,
          targets: [],
          workflowStatus: "ACTIVE" as const,
        },
      }),
      requestInformationId: input.requestInformation.requestInformationId,
    };
    await persistActionAndDecision(transaction, {
      ...input,
      ...execution,
      result,
      terminalOutcome: null,
    });
    return result;
  }
  if (
    input.target.action.actionType === "WITHDRAW" &&
    input.command.input.actionType === "WITHDRAW"
  ) {
    const application = input.target.stage.application;
    if (
      typeof application.id !== "string" ||
      typeof application.reference !== "string" ||
      typeof application.rowVersion !== "number" ||
      application.status !== "submitted"
    ) {
      fail("ACTION_UNAVAILABLE", "The application cannot be withdrawn.");
    }
    try {
      await withdrawFromWorkflowAction(transaction, {
        actorId: input.actorId,
        application: {
          id: application.id,
          reference: application.reference,
          rowVersion: application.rowVersion,
        },
        correlationId: input.command.correlationId,
        reason: input.command.input.reason,
        stageId: input.command.sourceStageInstanceId,
        workflowId: input.target.stage.workflowInstanceId,
        withdrawnAt: new Date(execution.executedAt),
      });
    } catch {
      fail(
        "ACTION_UNAVAILABLE",
        "The workflow changed before withdrawal completed.",
      );
    }
    const result = buildExecutionResult({
      ...execution,
      resultingRuntimeVersion: input.resultingRuntimeVersion + 1,
      target: input.target,
      transition: {
        kind: "WORKFLOW_WITHDRAWN",
        targets: [],
        workflowStatus: "CANCELLED",
      },
    });
    await persistActionAndDecision(transaction, {
      ...input,
      ...execution,
      result,
      terminalOutcome: "WITHDRAWN",
    });
    return result;
  }
  if (
    input.target.action.actionType === "REJECT" &&
    input.target.action.configuration.outcome.type === "TERMINAL"
  ) {
    return executeTerminalReject(
      transaction,
      input,
      configuredTransition!,
      execution,
    );
  }
  if (
    input.target.action.actionType === "REJECT" &&
    configuredTransition?.terminalOutcome
  ) {
    fail(
      "INVALID_RUNTIME_CONTEXT",
      "The rejection outcome does not match its transition.",
    );
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
    terminalOutcome:
      transition.workflowStatus === "ACTIVE"
        ? null
        : (configuredTransition?.terminalOutcome ?? null),
  });
  return result;
}
