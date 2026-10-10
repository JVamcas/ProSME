import { chatbotNotificationFields } from "./NotificationChatbotEvent";
import { reportingNotificationFields } from "./NotificationReportingEvent";
import { workflowHoldResumedNotificationFields } from "./NotificationWorkflowHoldEvent";

import type {
  NotificationCatalogKey,
  NotificationEventKey,
} from "./NotificationEvent";
import type { NotificationTemplateScope } from "./NotificationTemplate";
import { workflowDeadlineNotificationFields } from "./NotificationWorkflowDeadlineEvent";

export const globalNotificationTemplateFields = [
  "brandingLogoUrl",
  "platformName",
  "recipientName",
] as const;

export const notificationCatalogTemplateFields = {
  REPORTING: globalNotificationTemplateFields,
  CHATBOT: globalNotificationTemplateFields,
  AUTHENTICATION: [...globalNotificationTemplateFields, "actionUrl"],
  APPLICATIONS: [
    ...globalNotificationTemplateFields,
    "applicationReference",
    "fundingOpportunityTitle",
  ],
  FUNDING_CALLS: [
    ...globalNotificationTemplateFields,
    "fundingCallReference",
    "fundingCallTitle",
  ],
  WORKFLOW: [
    ...globalNotificationTemplateFields,
    "applicationReference",
    "fundingOpportunityTitle",
  ],
} as const satisfies Record<NotificationCatalogKey, readonly string[]>;

export const notificationEventTemplateFields = {
  "chatbot.case.created": chatbotNotificationFields,
  "reporting.generation.started": reportingNotificationFields,
  "reporting.generation.completed": reportingNotificationFields,
  "reporting.generation.failed": reportingNotificationFields,
  "workflow.sla.breached": workflowDeadlineNotificationFields,
  "workflow.information-request.reminder": workflowDeadlineNotificationFields,
  "workflow.hold.review-due": workflowDeadlineNotificationFields,
  "workflow.hold.resumed": workflowHoldResumedNotificationFields,
  "workflow.deferral.resumed": workflowDeadlineNotificationFields,
  "auth.email.verification": notificationCatalogTemplateFields.AUTHENTICATION,
  "auth.password.reset": notificationCatalogTemplateFields.AUTHENTICATION,
  "application.terminal-status-reached": [
    ...notificationCatalogTemplateFields.APPLICATIONS,
    "newStatus",
    "statusLabel",
    "previousStatus",
    "reasonCodes",
    "occurredAt",
    "applicationUrl",
  ],
  "application.submitted": [
    ...notificationCatalogTemplateFields.APPLICATIONS,
    "submittedAt",
    "applicationUrl",
  ],
  "funding-call.approval-request-withdrawn": [
    ...notificationCatalogTemplateFields.FUNDING_CALLS,
    "occurredAt",
    "reason",
    "fundingCallUrl",
  ],
  "funding-call.approval-requested": [
    ...notificationCatalogTemplateFields.FUNDING_CALLS,
    "occurredAt",
    "fundingCallUrl",
  ],
  "funding-call.approved": [
    ...notificationCatalogTemplateFields.FUNDING_CALLS,
    "occurredAt",
    "fundingCallUrl",
  ],
  "funding-call.archived": [
    ...notificationCatalogTemplateFields.FUNDING_CALLS,
    "occurredAt",
    "reason",
    "fundingCallUrl",
  ],
  "funding-call.closed": [
    ...notificationCatalogTemplateFields.FUNDING_CALLS,
    "occurredAt",
    "fundingCallUrl",
  ],
  "funding-call.opened": [
    ...notificationCatalogTemplateFields.FUNDING_CALLS,
    "occurredAt",
    "fundingCallUrl",
  ],
  "funding-call.published": [
    ...notificationCatalogTemplateFields.FUNDING_CALLS,
    "occurredAt",
    "fundingCallUrl",
  ],
  "funding-call.resumed": [
    ...notificationCatalogTemplateFields.FUNDING_CALLS,
    "occurredAt",
    "reason",
    "fundingCallUrl",
  ],
  "funding-call.returned-for-amendment": [
    ...notificationCatalogTemplateFields.FUNDING_CALLS,
    "occurredAt",
    "reason",
    "fundingCallUrl",
  ],
  "funding-call.suspended": [
    ...notificationCatalogTemplateFields.FUNDING_CALLS,
    "occurredAt",
    "reason",
    "fundingCallUrl",
  ],
  "funding-call.withdrawn": [
    ...notificationCatalogTemplateFields.FUNDING_CALLS,
    "occurredAt",
    "reason",
    "fundingCallUrl",
  ],
  "workflow.information-request.closed": [
    ...notificationCatalogTemplateFields.WORKFLOW,
    "question",
    "closedAt",
    "applicationUrl",
  ],
  "workflow.information-request.created": [
    ...notificationCatalogTemplateFields.WORKFLOW,
    "question",
    "createdAt",
    "deadlineAt",
    "informationRequestUrl",
  ],
  "workflow.information-request.expired": [
    ...notificationCatalogTemplateFields.WORKFLOW,
    "question",
    "deadlineAt",
    "expiredAt",
    "workQueueUrl",
  ],
  "workflow.information-request.responded": [
    ...notificationCatalogTemplateFields.WORKFLOW,
    "question",
    "respondedAt",
    "workQueueUrl",
  ],
  "workflow.task.escalated": [
    ...notificationCatalogTemplateFields.WORKFLOW,
    "stageName",
    "taskSummary",
    "assignedAt",
    "workQueueUrl",
    "reason",
    "trigger",
  ],
  "workflow.task.assigned": [
    ...notificationCatalogTemplateFields.WORKFLOW,
    "stageName",
    "taskSummary",
    "assignedAt",
    "workQueueUrl",
  ],
} as const satisfies Record<NotificationEventKey, readonly string[]>;

export type NotificationTemplateField =
  (typeof notificationEventTemplateFields)[NotificationEventKey][number];

export type NotificationTemplateFieldTarget = {
  catalogKey: NotificationCatalogKey | null;
  eventKey: NotificationEventKey | null;
  scope: NotificationTemplateScope;
};

export function fieldsForNotificationTarget(
  target: NotificationTemplateFieldTarget,
): readonly string[] {
  if (target.scope === "EVENT" && target.eventKey) {
    return notificationEventTemplateFields[target.eventKey];
  }
  if (target.scope === "CATALOG" && target.catalogKey) {
    return notificationCatalogTemplateFields[target.catalogKey];
  }
  return globalNotificationTemplateFields;
}

export {
  buildNotificationRenderValues,
  type NotificationRenderRecipient,
} from "./NotificationRenderValues";
