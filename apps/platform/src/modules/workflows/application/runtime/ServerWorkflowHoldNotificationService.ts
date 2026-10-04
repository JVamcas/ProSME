import "server-only";

import { captureNotificationOccurrence } from "@/modules/notifications/application/ServerNotificationOccurrenceService";
import type { WorkflowDeadlineCandidate } from "../../domain/runtime/WorkflowDeadline";
import type { WorkflowActionExecutionTransaction } from "../../infrastructure/WorkflowActionExecutionRepository";
import { loadWorkflowHoldNotification } from "../../infrastructure/WorkflowHoldNotificationRepository";
import { loadWorkflowDeadlineNotificationSnapshot } from "../../infrastructure/WorkflowDeadlineNotificationRepository";

export async function captureWorkflowHoldResumedNotification(
  transaction: WorkflowActionExecutionTransaction,
  candidate: WorkflowDeadlineCandidate,
  correlationId: string,
  occurredAt: Date,
) {
  const [snapshot, hold] = await Promise.all([
    loadWorkflowDeadlineNotificationSnapshot(
      transaction,
      candidate.stageInstanceId,
    ),
    loadWorkflowHoldNotification(transaction, candidate.sourceId),
  ]);
  return captureNotificationOccurrence(transaction, {
    aggregateId: snapshot.applicationId,
    aggregateType: "WORKFLOW_HOLD",
    correlationId,
    occurrenceKey: candidate.occurrenceKey,
    eventKey: "workflow.hold.resumed",
    recipients: [
      {
        ...hold.holder,
        recipientType: "ACTION_ACTOR",
        resolutionPath: "workflowHold.heldBy",
      },
    ],
    context: {
      ...snapshot,
      ...hold,
      assignees: [],
      correlationId,
      deadlineAt: null,
      kind: "HOLD_RESUMED",
      occurredAt: occurredAt.toISOString(),
      question: null,
      scheduledFor: new Date(candidate.scheduledFor).toISOString(),
      sourceId: candidate.sourceId,
      sourceIdempotencyKey: candidate.occurrenceKey,
      stageInstanceId: candidate.stageInstanceId,
      workflowInstanceId: candidate.workflowInstanceId,
    },
  });
}
