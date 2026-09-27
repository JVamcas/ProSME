import "server-only";

import {
  transactionalOutbox,
  workflowAuditEntries,
  workflowEvents,
} from "@/db/schema";
import type {
  CreateWorkflowRfiRequest,
  CreateWorkflowRfiResult,
} from "../domain/runtime/WorkflowRfi";
import type { WorkflowActionExecutionTransaction } from "./WorkflowActionExecutionRepository";
import { workflowRfiLifecycleEvents } from "./workflow-rfi.schema";

export async function appendWorkflowRfiCreationRecords(
  transaction: WorkflowActionExecutionTransaction,
  request: CreateWorkflowRfiRequest,
  result: CreateWorkflowRfiResult,
  occurredAt: Date,
) {
  const source = {
    actionDefinitionId: request.source.actionDefinitionId,
    applicationId: request.applicationId,
    stageInstanceId: request.source.stageInstanceId,
    taskId: request.source.taskId,
    workflowInstanceId: request.source.workflowInstanceId,
  };
  const payload = {
    actorId: request.requesterId,
    deadlineAt: result.deadlineAt.toISOString(),
    fromStatus: null,
    initiationType: request.initiationType,
    occurredAt: occurredAt.toISOString(),
    requestInformationId: result.requestInformationId,
    source,
    toStatus: "OPEN" as const,
  };
  await transaction.insert(workflowRfiLifecycleEvents).values({
    actionDefinitionId: source.actionDefinitionId,
    actorId: request.requesterId,
    actorType: "USER",
    applicationId: source.applicationId,
    correlationId: request.correlationId,
    details: payload,
    fromStatus: null,
    occurredAt,
    rfiId: result.requestInformationId,
    stageInstanceId: source.stageInstanceId,
    taskId: source.taskId,
    toStatus: "OPEN",
    workflowInstanceId: source.workflowInstanceId,
  });
  await transaction.insert(workflowEvents).values({
    actorId: request.requesterId,
    correlationId: request.correlationId,
    createdAt: occurredAt,
    eventCode: "RFI_CREATED",
    payload,
    workflowInstanceId: source.workflowInstanceId,
  });
  await transaction.insert(workflowAuditEntries).values({
    action: "RFI_CREATED",
    actorId: request.requesterId,
    after: { ...payload, rowVersion: 1, status: "OPEN" },
    before: null,
    correlationId: request.correlationId,
    createdAt: occurredAt,
    idempotencyKey: `RFI_CREATED:${request.idempotencyKey}`,
    reason: null,
    stageInstanceId: source.stageInstanceId,
    targetId: result.requestInformationId,
    targetType: "WORKFLOW_RFI",
    taskId: source.taskId,
    workflowInstanceId: source.workflowInstanceId,
  });
  await transaction.insert(transactionalOutbox).values({
    aggregateId: result.requestInformationId,
    availableAt: occurredAt,
    correlationId: request.correlationId,
    createdAt: occurredAt,
    eventCode: "RFI_CREATED",
    payload,
    schemaVersion: 1,
  });
}
