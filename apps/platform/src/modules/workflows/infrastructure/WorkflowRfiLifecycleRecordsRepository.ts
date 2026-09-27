import "server-only";

import {
  transactionalOutbox,
  workflowAuditEntries,
  workflowEvents,
} from "@/db/schema";
import type { WorkflowActionExecutionTransaction } from "./WorkflowActionExecutionRepository";
import { workflowRfiLifecycleEvents } from "./workflow-rfi.schema";

export async function appendWorkflowRfiLifecycleRecords(
  transaction: WorkflowActionExecutionTransaction,
  input: {
    actorId: string;
    correlationId: string;
    details?: Record<string, unknown>;
    fromStatus: "OPEN" | "RESPONDED";
    requestInformationId: string;
    stageInstanceId: string;
    taskId: string;
    toStatus: "RESPONDED" | "CLOSED" | "EXPIRED";
    workflowInstanceId: string;
  },
) {
  const eventCode = `RFI_${input.toStatus}`;
  const payload = {
    ...input.details,
    fromStatus: input.fromStatus,
    requestInformationId: input.requestInformationId,
    taskId: input.taskId,
    toStatus: input.toStatus,
  };
  await transaction.insert(workflowRfiLifecycleEvents).values({
    actorId: input.actorId,
    actorType: "USER",
    correlationId: input.correlationId,
    details: payload,
    fromStatus: input.fromStatus,
    rfiId: input.requestInformationId,
    toStatus: input.toStatus,
  });
  await transaction.insert(workflowEvents).values({
    actorId: input.actorId,
    correlationId: input.correlationId,
    eventCode,
    payload,
    workflowInstanceId: input.workflowInstanceId,
  });
  await transaction.insert(workflowAuditEntries).values({
    action: eventCode,
    actorId: input.actorId,
    after: { status: input.toStatus },
    before: { status: input.fromStatus },
    correlationId: input.correlationId,
    reason: null,
    stageInstanceId: input.stageInstanceId,
    targetId: input.requestInformationId,
    targetType: "WORKFLOW_RFI",
    taskId: input.taskId,
    workflowInstanceId: input.workflowInstanceId,
  });
  await transaction.insert(transactionalOutbox).values({
    aggregateId: input.requestInformationId,
    correlationId: input.correlationId,
    eventCode,
    payload,
    schemaVersion: 1,
  });
}
