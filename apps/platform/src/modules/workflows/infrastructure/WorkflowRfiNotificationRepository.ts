import "server-only";

import { eq } from "drizzle-orm";

import type { WorkflowActionExecutionTransaction } from "./WorkflowActionExecutionRepository";
import { workflowRfis } from "./workflow-rfi.schema";

export async function loadWorkflowRfiNotificationSource(
  transaction: WorkflowActionExecutionTransaction,
  requestInformationId: string,
) {
  const [request] = await transaction
    .select({
      applicationId: workflowRfis.applicationId,
      closedAt: workflowRfis.closedAt,
      correlationId: workflowRfis.correlationId,
      createdAt: workflowRfis.createdAt,
      deadlineAt: workflowRfis.deadlineAt,
      idempotencyKey: workflowRfis.idempotencyKey,
      question: workflowRfis.question,
      recipientUserId: workflowRfis.recipientUserId,
      respondedAt: workflowRfis.respondedAt,
      stageInstanceId: workflowRfis.stageInstanceId,
      workflowInstanceId: workflowRfis.workflowInstanceId,
    })
    .from(workflowRfis)
    .where(eq(workflowRfis.id, requestInformationId))
    .limit(1);

  if (!request) {
    throw new Error("Information request notification context is unavailable.");
  }
  return request;
}
