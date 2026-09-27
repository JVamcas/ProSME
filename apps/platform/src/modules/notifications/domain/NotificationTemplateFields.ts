import type {
  NotificationCatalogKey,
  NotificationEventContextByKey,
  NotificationEventKey,
} from "./NotificationEvent";
import type { NotificationTemplateScope } from "./NotificationTemplate";

export const globalNotificationTemplateFields = [
  "platformName",
  "recipientName",
] as const;

export const notificationCatalogTemplateFields = {
  APPLICATIONS: [
    ...globalNotificationTemplateFields,
    "applicationReference",
    "fundingOpportunityTitle",
  ],
  WORKFLOW: [
    ...globalNotificationTemplateFields,
    "applicationReference",
    "fundingOpportunityTitle",
  ],
} as const satisfies Record<NotificationCatalogKey, readonly string[]>;

export const notificationEventTemplateFields = {
  "application.submitted": [
    ...notificationCatalogTemplateFields.APPLICATIONS,
    "submittedAt",
    "applicationUrl",
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
  const common = {
    applicationReference: input.context.applicationReference,
    fundingOpportunityTitle: input.context.fundingOpportunityTitle,
    platformName: "SME Fund Namibia",
    recipientName: input.recipient.displayName,
  };

  if (input.eventKey === "application.submitted") {
    const context = input.context as NotificationEventContextByKey["application.submitted"];
    return {
      ...common,
      applicationUrl: trustedUrl(
        input.publicApplicationUrl,
        `/portal/applications/${context.applicationId}`,
      ),
      submittedAt: formatTimestamp(context.submittedAt),
    };
  }

  const context = input.context as NotificationEventContextByKey["workflow.task.assigned"];
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
