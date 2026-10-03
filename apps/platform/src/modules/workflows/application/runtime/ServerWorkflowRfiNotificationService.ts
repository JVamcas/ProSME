import "server-only";

import { captureNotificationOccurrence } from "@/modules/notifications/application/ServerNotificationOccurrenceService";
import type { WorkflowActionExecutionTransaction } from "../../infrastructure/WorkflowActionExecutionRepository";
import { loadWorkflowDeadlineNotificationSnapshot } from "../../infrastructure/WorkflowDeadlineNotificationRepository";
import { loadWorkflowRfiNotificationSource } from "../../infrastructure/WorkflowRfiNotificationRepository";

export async function captureWorkflowRfiLifecycleNotification(
  transaction: WorkflowActionExecutionTransaction,
  requestInformationId: string,
  event: "created" | "responded" | "closed",
  correlationId?: string,
) {
  const request = await loadWorkflowRfiNotificationSource(
    transaction,
    requestInformationId,
  );
  const snapshot = await loadWorkflowDeadlineNotificationSnapshot(
    transaction,
    request.stageInstanceId,
  );
  if (
    snapshot.applicationId !== request.applicationId ||
    snapshot.owner.userId !== request.recipientUserId
  ) {
    throw new Error("Information request notification recipient does not match its application.");
  }

  const occurrence = {
    aggregateId: request.applicationId,
    aggregateType: "WORKFLOW_RFI",
    correlationId: correlationId ?? request.correlationId,
    occurrenceKey: `rfi-${event}:${requestInformationId}`,
    recipients: [
      {
        ...snapshot.owner,
        recipientType: "APPLICATION_OWNER",
        resolutionPath: "workflowRfi.recipientUserId",
      },
      ...snapshot.assignees.map((assignee) => ({
        ...assignee,
        recipientType: "ASSIGNED_USER",
        resolutionPath: "workflowTask.assignment",
      })),
    ],
  };
  const context = {
    applicationId: request.applicationId,
    applicationReference: snapshot.applicationReference,
    assignees: snapshot.assignees,
    correlationId: occurrence.correlationId,
    fundingOpportunityTitle: snapshot.fundingOpportunityTitle,
    owner: snapshot.owner,
    question: request.question.slice(0, 2_000),
    requestInformationId,
    sourceIdempotencyKey: request.idempotencyKey,
    workflowInstanceId: request.workflowInstanceId,
  };
  if (event === "created") {
    return captureNotificationOccurrence(transaction, {
      ...occurrence,
      eventKey: "workflow.information-request.created",
      context: {
        ...context,
        createdAt: request.createdAt.toISOString(),
        deadlineAt: request.deadlineAt.toISOString(),
      },
    });
  }
  if (event === "responded") {
    if (!request.respondedAt) {
      throw new Error("Information request response timestamp is unavailable.");
    }
    return captureNotificationOccurrence(transaction, {
      ...occurrence,
      eventKey: "workflow.information-request.responded",
      context: { ...context, respondedAt: request.respondedAt.toISOString() },
    });
  }
  if (!request.closedAt) {
    throw new Error("Information request closure timestamp is unavailable.");
  }
  return captureNotificationOccurrence(transaction, {
    ...occurrence,
    eventKey: "workflow.information-request.closed",
    context: { ...context, closedAt: request.closedAt.toISOString() },
  });
}

export function captureWorkflowRfiCreatedNotification(
  transaction: WorkflowActionExecutionTransaction,
  requestInformationId: string,
) {
  return captureWorkflowRfiLifecycleNotification(
    transaction,
    requestInformationId,
    "created",
  );
}
