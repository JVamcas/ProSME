import "server-only";

import {
  workflowAuditEntries,
  workflowDecisions,
  workflowEvents,
} from "@/db/schema";
import type { WorkflowActionInput } from "../domain/actions/WorkflowActionExecution";
import type { WorkflowActionExecutionTransaction } from "./WorkflowActionExecutionRepository";

export async function recordApprovalDecision(
  transaction: WorkflowActionExecutionTransaction,
  input: {
    actionDefinitionId: string;
    actionExecutionId: string;
    actionKey: string;
    actorId: string;
    correlationId: string;
    decidedAt: Date;
    decisionId: string;
    normalizedInput: WorkflowActionInput;
    sourceStageInstanceId: string;
    taskId: string | null;
    workflowInstanceId: string;
  },
) {
  await transaction.insert(workflowDecisions).values({
    actionDefinitionId: input.actionDefinitionId,
    actionExecutionId: input.actionExecutionId,
    actionKey: input.actionKey,
    actorId: input.actorId,
    decidedAt: input.decidedAt,
    id: input.decisionId,
    input: input.normalizedInput,
    outcome: "APPROVED",
    sourceStageInstanceId: input.sourceStageInstanceId,
    taskId: input.taskId,
    workflowInstanceId: input.workflowInstanceId,
  });
  await transaction.insert(workflowEvents).values({
    actorId: input.actorId,
    correlationId: input.correlationId,
    eventCode: "DECISION_RECORDED",
    payload: {
      actionDefinitionId: input.actionDefinitionId,
      actionExecutionId: input.actionExecutionId,
      actionKey: input.actionKey,
      decisionId: input.decisionId,
      outcome: "APPROVED",
      sourceStageInstanceId: input.sourceStageInstanceId,
      taskId: input.taskId,
    },
    workflowInstanceId: input.workflowInstanceId,
  });
  await transaction.insert(workflowAuditEntries).values({
    action: "DECISION_RECORDED",
    actorId: input.actorId,
    after: {
      actionDefinitionId: input.actionDefinitionId,
      actionExecutionId: input.actionExecutionId,
      actionKey: input.actionKey,
      decidedAt: input.decidedAt.toISOString(),
      outcome: "APPROVED",
    },
    before: null,
    correlationId: input.correlationId,
    stageInstanceId: input.sourceStageInstanceId,
    targetId: input.decisionId,
    targetType: "WORKFLOW_DECISION",
    taskId: input.taskId,
    workflowInstanceId: input.workflowInstanceId,
  });
}
