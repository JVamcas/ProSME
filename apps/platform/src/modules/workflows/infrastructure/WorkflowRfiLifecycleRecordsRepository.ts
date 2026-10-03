import "server-only";

import {
  transactionalOutbox,
  workflowAuditEntries,
  workflowEvents,
} from "@/db/schema";
import type {
  WorkflowRfiLifecycleEventCode,
  WorkflowRfiSourceReference,
} from "../domain/runtime/WorkflowRfi";
import type { WorkflowActionExecutionTransaction } from "./WorkflowActionExecutionRepository";
import { workflowRfiLifecycleEvents } from "./workflow-rfi.schema";

export async function appendWorkflowRfiLifecycleRecords(
  transaction: WorkflowActionExecutionTransaction,
  input: {
    actorId: string;
    actorType?: "USER" | "SYSTEM";
    correlationId: string;
    details?: Record<string, unknown>;
    fromStatus: "OPEN" | "RESPONDED";
    nextRowVersion: number;
    occurredAt: Date;
    previousRowVersion: number;
    requestInformationId: string;
    source: WorkflowRfiSourceReference;
    toStatus: "RESPONDED" | "CLOSED" | "EXPIRED";
  },
) {
  const eventCode = `RFI_${input.toStatus}` as WorkflowRfiLifecycleEventCode;
  const payload = {
    ...input.details,
    actorId: input.actorId,
    fromStatus: input.fromStatus,
    occurredAt: input.occurredAt.toISOString(),
    requestInformationId: input.requestInformationId,
    source: input.source,
    toStatus: input.toStatus,
  };
  await transaction.insert(workflowRfiLifecycleEvents).values({
    actionDefinitionId: input.source.actionDefinitionId,
    actorId: input.actorType === "SYSTEM" ? null : input.actorId,
    actorType: input.actorType ?? "USER",
    applicationId: input.source.applicationId,
    correlationId: input.correlationId,
    details: payload,
    fromStatus: input.fromStatus,
    occurredAt: input.occurredAt,
    rfiId: input.requestInformationId,
    stageInstanceId: input.source.stageInstanceId,
    taskId: input.source.taskId,
    toStatus: input.toStatus,
    workflowInstanceId: input.source.workflowInstanceId,
  });
  await transaction.insert(workflowEvents).values({
    actorId: input.actorId,
    correlationId: input.correlationId,
    createdAt: input.occurredAt,
    eventCode,
    payload,
    workflowInstanceId: input.source.workflowInstanceId,
  });
  await transaction.insert(workflowAuditEntries).values({
    action: eventCode,
    actorId: input.actorId,
    after: {
      ...input.details,
      rowVersion: input.nextRowVersion,
      status: input.toStatus,
    },
    before: {
      rowVersion: input.previousRowVersion,
      status: input.fromStatus,
    },
    correlationId: input.correlationId,
    createdAt: input.occurredAt,
    reason: null,
    stageInstanceId: input.source.stageInstanceId,
    targetId: input.requestInformationId,
    targetType: "WORKFLOW_RFI",
    taskId: input.source.taskId,
    workflowInstanceId: input.source.workflowInstanceId,
  });
  await transaction.insert(transactionalOutbox).values({
    aggregateId: input.requestInformationId,
    availableAt: input.occurredAt,
    correlationId: input.correlationId,
    createdAt: input.occurredAt,
    eventCode,
    payload,
    schemaVersion: 1,
  });
}
