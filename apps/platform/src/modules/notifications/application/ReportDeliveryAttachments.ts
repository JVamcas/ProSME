import "server-only";
import {
  PermissionDeniedError,
  AuthenticationRequiredError,
} from "@/auth/authorization/policy";
import {
  loadReportEmailArtifact,
  ReportEmailArtifactError,
} from "@/modules/reporting/ServerReportEmailArtifactService";
import {
  reportingEventKeys,
  reportingEventContextSchema,
  type ReportingEventKey,
} from "../domain/NotificationReportingEvent";
import type { ClaimedNotificationDelivery } from "../infrastructure/NotificationDispatchRepository";
import { reportingRecipientStillBound } from "../infrastructure/ReportingNotificationRecipientRepository";
import { notificationErrorCodes } from "../domain/NotificationErrors";
import { NotificationEmailSendError } from "./NotificationEmailSender";

export async function resolveReportDeliveryAttachments(
  delivery: ClaimedNotificationDelivery,
) {
  if (!reportingEventKeys.includes(delivery.eventKey as ReportingEventKey))
    return [];
  const context = reportingEventContextSchema.parse(delivery.context);
  if (
    !delivery.reportId ||
    context.reportId !== delivery.reportId ||
    !delivery.ruleId ||
    !delivery.recipientUserId
  ) {
    throw new NotificationEmailSendError(
      notificationErrorCodes.invalidContext,
      false,
    );
  }
  const bound = await reportingRecipientStillBound({
    reportId: delivery.reportId,
    ruleId: delivery.ruleId,
    eventKey: delivery.eventKey,
    userId: delivery.recipientUserId,
    email: delivery.recipientEmail,
  });
  if (!bound)
    throw new NotificationEmailSendError(
      notificationErrorCodes.invalidRecipient,
      false,
    );
  try {
    return await loadReportEmailArtifact(
      delivery.recipientUserId,
      context,
      delivery.eventKey as ReportingEventKey,
    );
  } catch (error) {
    if (
      error instanceof PermissionDeniedError ||
      error instanceof AuthenticationRequiredError
    ) {
      throw new NotificationEmailSendError(
        notificationErrorCodes.invalidRecipient,
        false,
      );
    }
    throw new NotificationEmailSendError(
      notificationErrorCodes.attachmentUnavailable,
      !(error instanceof ReportEmailArtifactError),
    );
  }
}
