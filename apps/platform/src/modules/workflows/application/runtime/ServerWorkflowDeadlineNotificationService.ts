import "server-only";

import { captureNotificationOccurrence } from "@/modules/notifications/application/ServerNotificationOccurrenceService";
import type { NotificationEventKey } from "@/modules/notifications/domain/NotificationEvent";
import type { WorkflowDeadlineCandidate } from "../../domain/runtime/WorkflowDeadline";
import type { WorkflowActionExecutionTransaction } from "../../infrastructure/WorkflowActionExecutionRepository";
import {
  loadWorkflowDeadlineNotificationSnapshot,
  type DeadlineNotificationSnapshot,
} from "../../infrastructure/WorkflowDeadlineNotificationRepository";

const deadlineEventKeys = {
  SLA_BREACH: "workflow.sla.breached",
  RFI_REMINDER: "workflow.information-request.reminder",
  HOLD_REVIEW: "workflow.hold.review-due",
  DEFERRAL_RESUMED: "workflow.deferral.resumed",
} as const satisfies Partial<Record<WorkflowDeadlineCandidate["kind"], NotificationEventKey>>;

export async function captureWorkflowDeadlineNotification(
  transaction: WorkflowActionExecutionTransaction,
  candidate: WorkflowDeadlineCandidate,
  correlationId: string,
  occurredAt: Date,
  expiredRfi?: { deadlineAt: Date; question: string },
  sourceSnapshot?: DeadlineNotificationSnapshot,
) {
  const snapshot = sourceSnapshot
    ?? await loadWorkflowDeadlineNotificationSnapshot(transaction, candidate.stageInstanceId);
  const recipients = [
    { ...snapshot.owner, recipientType: "APPLICATION_OWNER", resolutionPath: "application.applicantUserId" },
    ...snapshot.assignees.map((assignee) => ({
      ...assignee,
      recipientType: "ASSIGNED_USER",
      resolutionPath: "workflowTask.assignment",
    })),
  ];
  const common = {
    applicationId: snapshot.applicationId,
    applicationReference: snapshot.applicationReference,
    assignees: snapshot.assignees,
    correlationId,
    fundingOpportunityTitle: snapshot.fundingOpportunityTitle,
    owner: snapshot.owner,
    sourceIdempotencyKey: candidate.occurrenceKey,
    workflowInstanceId: candidate.workflowInstanceId,
  };
  const occurrence = {
    aggregateId: snapshot.applicationId,
    aggregateType: "WORKFLOW_DEADLINE",
    correlationId,
    occurrenceKey: candidate.occurrenceKey,
    recipients,
  };
  if (candidate.kind === "RFI_EXPIRED") {
    if (!expiredRfi) throw new Error("Expired RFI notification evidence is required.");
    return captureNotificationOccurrence(transaction, {
      ...occurrence,
      eventKey: "workflow.information-request.expired",
      context: {
        ...common,
        deadlineAt: expiredRfi.deadlineAt.toISOString(),
        expiredAt: occurredAt.toISOString(),
        question: expiredRfi.question.slice(0, 2_000),
        requestInformationId: candidate.sourceId,
      },
    });
  }
  return captureNotificationOccurrence(transaction, {
    ...occurrence,
    eventKey: deadlineEventKeys[candidate.kind],
    context: {
      ...common,
      deadlineAt: expiredRfi?.deadlineAt.toISOString() ?? null,
      kind: candidate.kind,
      occurredAt: occurredAt.toISOString(),
      scheduledFor: new Date(candidate.scheduledFor).toISOString(),
      sourceId: candidate.sourceId,
      question: expiredRfi?.question.slice(0, 2_000) ?? null,
      stageInstanceId: candidate.stageInstanceId,
      stageName: snapshot.stageName,
    },
  });
}
