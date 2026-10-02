import type {
  NotificationCatalogKey,
  NotificationEventContextByKey,
  NotificationEventKey,
} from "./NotificationEvent";
import type { NotificationTemplateScope } from "./NotificationTemplate";

export const globalNotificationTemplateFields = [
  "brandingLogoUrl",
  "platformName",
  "recipientName",
] as const;

export const notificationCatalogTemplateFields = {
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

export type NotificationRenderRecipient = {
  displayName: string;
  userId: string;
};

type RenderValueInput<Key extends NotificationEventKey> = {
  context: NotificationEventContextByKey[Key];
  eventKey: Key;
  publicApplicationUrl: string;
  recipient: NotificationRenderRecipient;
};

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("en-NA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Windhoek",
  }).format(new Date(value));
}

function trustedUrl(baseUrl: string, path: string): string {
  return new URL(path, `${baseUrl.replace(/\/$/, "")}/`).toString();
}

export function buildNotificationRenderValues<Key extends NotificationEventKey>(
  input: RenderValueInput<Key>,
): Record<string, string> {
  if (input.eventKey.startsWith("funding-call.")) {
    const context =
      input.context as NotificationEventContextByKey["funding-call.approval-requested"];
    return {
      fundingCallReference: context.fundingCallReference,
      fundingCallTitle: context.fundingCallTitle,
      fundingCallUrl: trustedUrl(
        input.publicApplicationUrl,
        `/admin/funding-calls/${context.fundingCallId}`,
      ),
      occurredAt: formatTimestamp(context.occurredAt),
      platformName: "SME Fund Namibia",
      reason: context.reason ?? "Not provided",
      recipientName: input.recipient.displayName,
    };
  }
  const applicationContext =
    input.context as NotificationEventContextByKey["application.submitted"];
  const common = {
    applicationReference: applicationContext.applicationReference,
    fundingOpportunityTitle: applicationContext.fundingOpportunityTitle,
    platformName: "SME Fund Namibia",
    recipientName: input.recipient.displayName,
  };

  if (input.eventKey === "application.terminal-status-reached") {
    const context = input.context as NotificationEventContextByKey["application.terminal-status-reached"];
    return {
      ...common,
      applicationUrl: trustedUrl(input.publicApplicationUrl, `/portal/applications/${context.applicationId}`),
      newStatus: context.newStatus,
      statusLabel: context.statusLabel,
      previousStatus: context.previousStatus,
      reasonCodes: context.reasonCodes.join(", "),
      occurredAt: formatTimestamp(context.occurredAt),
    };
  }

  if (input.eventKey === "application.submitted") {
    const context =
      input.context as NotificationEventContextByKey["application.submitted"];
    return {
      ...common,
      applicationUrl: trustedUrl(
        input.publicApplicationUrl,
        `/portal/applications/${context.applicationId}`,
      ),
      submittedAt: formatTimestamp(context.submittedAt),
    };
  }

  if (input.eventKey === "workflow.information-request.created") {
    const context =
      input.context as NotificationEventContextByKey["workflow.information-request.created"];
    return {
      ...common,
      createdAt: formatTimestamp(context.createdAt),
      deadlineAt: formatTimestamp(context.deadlineAt),
      informationRequestUrl: trustedUrl(
        input.publicApplicationUrl,
        `/portal/applications/${context.applicationId}/requests/${context.requestInformationId}`,
      ),
      question: context.question,
    };
  }

  if (input.eventKey === "workflow.information-request.responded") {
    const context =
      input.context as NotificationEventContextByKey["workflow.information-request.responded"];
    return {
      ...common,
      question: context.question,
      respondedAt: formatTimestamp(context.respondedAt),
      workQueueUrl: trustedUrl(input.publicApplicationUrl, "/admin/work-queue"),
    };
  }

  if (input.eventKey === "workflow.information-request.closed") {
    const context =
      input.context as NotificationEventContextByKey["workflow.information-request.closed"];
    return {
      ...common,
      applicationUrl: trustedUrl(
        input.publicApplicationUrl,
        `/portal/applications/${context.applicationId}`,
      ),
      closedAt: formatTimestamp(context.closedAt),
      question: context.question,
    };
  }

  if (input.eventKey === "workflow.information-request.expired") {
    const context =
      input.context as NotificationEventContextByKey["workflow.information-request.expired"];
    return {
      ...common,
      deadlineAt: formatTimestamp(context.deadlineAt),
      expiredAt: formatTimestamp(context.expiredAt),
      question: context.question,
      workQueueUrl: trustedUrl(input.publicApplicationUrl, "/admin/work-queue"),
    };
  }

  const context =
    input.context as NotificationEventContextByKey["workflow.task.assigned"];
  return {
    ...common,
    assignedAt: formatTimestamp(context.assignedAt),
    stageName: context.stageName,
    taskSummary: context.tasks
      .filter((task) => task.assignedUserId === input.recipient.userId)
      .map((task) => task.taskName)
      .join(", "),
    workQueueUrl: trustedUrl(input.publicApplicationUrl, "/admin/work-queue"),
  };
}
