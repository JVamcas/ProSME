import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { DatabaseTransaction } from "@/platform/database/client";
import {
  applicationAppealEventSchema,
  applicationAppealFields,
  type ApplicationAppealEvent,
} from "../domain/NotificationApplicationAppealEvent";
import {
  NotificationValidationError,
  notificationErrorCodes,
} from "../domain/NotificationErrors";
import {
  insertAppealAcknowledgement,
  appealDeliveryAuthorized,
} from "../infrastructure/ApplicationAppealNotificationRepository";
import type { ClaimedNotificationDelivery } from "../infrastructure/NotificationDispatchRepository";
import { captureNotificationOccurrence } from "./ServerNotificationOccurrenceService";
import { buildServerNotificationRenderValues } from "./ServerNotificationRenderValues";
import { renderNotificationTemplate } from "./NotificationTemplateRenderer";

export async function captureApplicationAppealNotifications(
  transaction: DatabaseTransaction,
  context: ApplicationAppealEvent,
  recipient: { name: string; email: string },
) {
  const parsed = applicationAppealEventSchema.parse(context);
  await insertAppealAcknowledgement(transaction, parsed, recipient);
  await captureNotificationOccurrence(transaction, {
    aggregateId: context.appealId,
    aggregateType: "APPLICATION_APPEAL",
    correlationId: context.appealId,
    eventKey: "application.appeal.received",
    occurrenceKey: `appeal-received:${context.appealId}`,
    context: parsed,
    recipients: [],
  });
}
export async function requireAppealDeliveryRecipient(
  delivery: ClaimedNotificationDelivery,
) {
  if (
    !delivery.recipientUserId ||
    !(await appealDeliveryAuthorized(
      delivery.recipientUserId,
      delivery.recipientEmail,
      delivery.ruleId ?? null,
    ))
  ) {
    throw new NotificationValidationError(
      notificationErrorCodes.invalidRecipient,
      "The recipient cannot access application appeals.",
    );
  }
}
export async function renderAppealAcknowledgement(
  delivery: ClaimedNotificationDelivery,
) {
  const context = applicationAppealEventSchema.parse(delivery.context);
  const htmlTemplate =
    delivery.htmlTemplate ||
    (await readFile(
      path.join(
        process.cwd(),
        "src/modules/notifications/templates/email/application-appeal-acknowledged.html",
      ),
      "utf8",
    ));
  return renderNotificationTemplate(
    {
      htmlTemplate,
      subjectTemplate:
        delivery.subjectTemplate || "Appeal received: {{appealReference}}",
      plainTextTemplate:
        delivery.plainTextTemplate ||
        "Hello {{recipientName}},\nWe have received appeal {{appealReference}} for application {{applicationReference}}. Our team will review it.\nContact us: {{contactUrl}}\n{{platformName}}",
    },
    applicationAppealFields,
    buildServerNotificationRenderValues({
      context,
      eventKey: "application.appeal.acknowledged",
      recipient: { displayName: delivery.recipientName, userId: "" },
    }),
  );
}
