import "server-only";

import {
  workflowActionExecutions,
  workflowAuditEntries,
  workflowEvents,
} from "@/db/schema";
import type {
  WorkflowActionExecutionResult,
  WorkflowActionInput,
} from "../domain/actions/WorkflowActionExecution";
import type {
  WorkflowActionExecutionTarget,
  WorkflowActionExecutionTransaction,
} from "./WorkflowActionExecutionRepository";

export async function recordWorkflowActionExecution(
  transaction: WorkflowActionExecutionTransaction,
  input: {
    action: WorkflowActionExecutionTarget["action"];
    actorId: string;
    conditionEvaluation: Record<string, unknown>;
    correlationId: string;
    expectedRuntimeVersion: number;
    id: string;
    idempotencyKey: string;
    normalizedInput: WorkflowActionInput;
    resolvedTarget: Record<string, unknown> | null;
    result: WorkflowActionExecutionResult;
    resultingRuntimeVersion: number;
    sourceStageInstanceId: string;
    taskBefore: WorkflowActionExecutionTarget["task"];
    taskId: string | null;
    workflowInstanceId: string;
  },
) {
  const preservesTask = ["PUT_ON_HOLD", "REFER", "RESUME"].includes(
    input.action.actionType,
  );
  await transaction.insert(workflowActionExecutions).values({
    actionDefinitionId: input.action.id,
    actionKey: input.action.stableKey,
    actionType: input.action.actionType,
    actorId: input.actorId,
    actorIdentifier: input.actorId,
    actorType: "USER",
    comment: input.normalizedInput.comment ?? null,
    conditionEvaluation: input.conditionEvaluation,
    correlationId: input.correlationId,
    expectedRuntimeVersion: input.expectedRuntimeVersion,
    id: input.id,
    idempotencyKey: input.idempotencyKey,
    normalizedInput: input.normalizedInput,
    reasonCode: input.normalizedInput.reasonCode ?? null,
    resolvedTarget: input.resolvedTarget,
    result: input.result,
    resultingRuntimeVersion: input.resultingRuntimeVersion,
    sourceStageInstanceId: input.sourceStageInstanceId,
    taskId: input.taskId,
    workflowInstanceId: input.workflowInstanceId,
  });
  await transaction.insert(workflowEvents).values({
    actorId: input.actorId,
    correlationId: input.correlationId,
    eventCode: "ACTION_EXECUTED",
    payload: {
      actionExecutionId: input.id,
      actionKey: input.action.stableKey,
      actionType: input.action.actionType,
      resultingRuntimeVersion: input.resultingRuntimeVersion,
      sourceStageInstanceId: input.sourceStageInstanceId,
      taskId: input.taskId,
    },
    workflowInstanceId: input.workflowInstanceId,
  });
  await transaction.insert(workflowAuditEntries).values({
    action: "ACTION_EXECUTED",
    actorId: input.actorId,
    after: {
      actionKey: input.action.stableKey,
      actionType: input.action.actionType,
      resultingRuntimeVersion: input.resultingRuntimeVersion,
      resolvedTarget: input.resolvedTarget,
      task: input.taskBefore
        ? {
            id: input.taskBefore.id,
            rowVersion: input.taskBefore.rowVersion + (preservesTask ? 0 : 1),
            status: preservesTask ? input.taskBefore.status : "COMPLETED",
          }
        : null,
    },
    before: {
      runtimeVersion: input.expectedRuntimeVersion,
      task: input.taskBefore
        ? {
            id: input.taskBefore.id,
            rowVersion: input.taskBefore.rowVersion,
            status: input.taskBefore.status,
          }
        : null,
    },
    correlationId: input.correlationId,
    idempotencyKey: input.idempotencyKey,
    reason: input.normalizedInput.reasonCode ?? input.normalizedInput.comment,
    stageInstanceId: input.sourceStageInstanceId,
    targetId: input.id,
    targetType: "WORKFLOW_ACTION_EXECUTION",
    taskId: input.taskId,
    workflowInstanceId: input.workflowInstanceId,
  });
}
