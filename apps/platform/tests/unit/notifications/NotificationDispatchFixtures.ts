import type { ClaimedNotificationDelivery } from "@/modules/notifications/infrastructure/NotificationDispatchRepository";

const applicationId = "80000000-0000-4000-8000-000000000001";
const ownerId = "80000000-0000-4000-8000-000000000002";
const workflowId = "80000000-0000-4000-8000-000000000003";

export function applicationDelivery(
  overrides: Partial<ClaimedNotificationDelivery> = {},
): ClaimedNotificationDelivery {
  return {
    attemptCount: 0,
    context: {
      applicationId,
      applicationOwnerUserId: ownerId,
      applicationReference: "SME Fund-1",
      correlationId: "correlation-1",
      fundingOpportunityTitle: "Growth Fund",
      ownerDisplayName: "Applicant",
      ownerEmail: "applicant@example.com",
      sourceIdempotencyKey: "submission-1",
      submittedAt: "2026-09-27T09:00:00.000Z",
      workflowInstanceId: workflowId,
    },
    correlationId: "correlation-1",
    deliveryId: "81000000-0000-4000-8000-000000000001",
    eventKey: "application.submitted",
    htmlTemplate: "<p>Hello {{recipientName}}</p>",
    outboxId: "82000000-0000-4000-8000-000000000001",
    plainTextTemplate: "Hello {{recipientName}}",
    recipientEmail: "applicant@example.com",
    recipientName: "Applicant",
    recipientUserId: ownerId,
    subjectTemplate: "Application {{applicationReference}}",
    templateVersionId: "83000000-0000-4000-8000-000000000001",
    ...overrides,
  };
}

export function workflowDelivery(): ClaimedNotificationDelivery {
  const assigneeId = "80000000-0000-4000-8000-000000000004";
  return applicationDelivery({
    context: {
      applicationId,
      applicationReference: "SME Fund-1",
      assignedAt: "2026-09-27T09:30:00.000Z",
      assignees: [
        {
          displayName: "Reviewer",
          email: "reviewer@example.com",
          userId: assigneeId,
        },
      ],
      correlationId: "correlation-2",
      fundingOpportunityTitle: "Growth Fund",
      sourceIdempotencyKey: "assignment-1",
      stageInstanceId: "80000000-0000-4000-8000-000000000005",
      stageName: "Assessment",
      tasks: [
        {
          assignedUserId: assigneeId,
          taskId: "80000000-0000-4000-8000-000000000006",
          taskName: "Review",
        },
      ],
      workflowInstanceId: workflowId,
    },
    correlationId: "correlation-2",
    deliveryId: "81000000-0000-4000-8000-000000000002",
    eventKey: "workflow.task.assigned",
    outboxId: "82000000-0000-4000-8000-000000000002",
    recipientEmail: "reviewer@example.com",
    recipientName: "Reviewer",
    recipientUserId: assigneeId,
  });
}
