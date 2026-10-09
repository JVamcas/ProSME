import type {
  NotificationEventContextByKey,
  NotificationEventKey,
} from "./NotificationEvent";
import { workflowHoldScopeLabels } from "@/modules/workflows/domain/runtime/WorkflowHold";
import { reportingRenderValues } from "./ReportingNotificationRenderValues";
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
  if (input.eventKey.startsWith("reporting.")) {
    return reportingRenderValues(
      input.context as NotificationEventContextByKey["reporting.generation.started"],
      input.recipient.displayName,
      input.publicApplicationUrl,
    );
  }
  if ("kind" in input.context && "scheduledFor" in input.context) {
    const context = input.context as
      | NotificationEventContextByKey["workflow.sla.breached"]
      | NotificationEventContextByKey["workflow.hold.resumed"];
    return {
      platformName: "SME Fund Namibia",
      recipientName: input.recipient.displayName,
      applicationReference: context.applicationReference,
      fundingOpportunityTitle: context.fundingOpportunityTitle,
      stageName: context.stageName,
      scheduledFor: formatTimestamp(context.scheduledFor),
      occurredAt: formatTimestamp(context.occurredAt),
      kind: context.kind,
      ...("scope" in context
        ? {
            holdScope: workflowHoldScopeLabels[context.scope],
            resumptionStatus: context.processingStillHeld
              ? "This hold has ended. Other holds still apply to the affected work."
              : "This hold has ended. Work can continue subject to its other requirements.",
          }
        : {}),
      question: context.question ?? "",
      deadlineAt: context.deadlineAt ? formatTimestamp(context.deadlineAt) : "",
      workQueueUrl: trustedUrl(input.publicApplicationUrl, "/admin/work-queue"),
      applicationUrl: trustedUrl(
        input.publicApplicationUrl,
        `/portal/applications/${context.applicationId}`,
      ),
      informationRequestUrl:
        context.kind === "RFI_REMINDER"
          ? trustedUrl(
              input.publicApplicationUrl,
              `/portal/applications/${context.applicationId}/requests/${context.sourceId}`,
            )
          : "",
    };
  }
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
    const context =
      input.context as NotificationEventContextByKey["application.terminal-status-reached"];
    return {
      ...common,
      applicationUrl: trustedUrl(
        input.publicApplicationUrl,
        `/portal/applications/${context.applicationId}`,
      ),
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

  const escalationFields: Record<string, string> =
    input.eventKey === "workflow.task.escalated"
      ? {
          reason:
            (
              input.context as NotificationEventContextByKey["workflow.task.escalated"]
            ).reason ?? "",
          trigger: (
            input.context as NotificationEventContextByKey["workflow.task.escalated"]
          ).trigger.replaceAll("_", " "),
        }
      : {};
  const context =
    input.context as NotificationEventContextByKey["workflow.task.assigned"];
  return {
    ...common,
    ...escalationFields,
    assignedAt: formatTimestamp(context.assignedAt),
    stageName: context.stageName,
    taskSummary: context.tasks
      .filter((task) => task.assignedUserId === input.recipient.userId)
      .map((task) => task.taskName)
      .join(", "),
    workQueueUrl: trustedUrl(input.publicApplicationUrl, "/admin/work-queue"),
  };
}
