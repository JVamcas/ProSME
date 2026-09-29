import "server-only";

import {
  parseNotificationContext,
  notificationEventCatalogue,
  type NotificationEventContextByKey,
  type NotificationEventKey,
} from "../domain/NotificationEvent";
import { normalizeNotificationRecipients } from "../domain/NotificationOccurrence";
import {
  insertNotificationOccurrence,
  type NotificationOccurrenceTransaction,
  type NotificationOccurrenceWriteResult,
} from "../infrastructure/NotificationOccurrenceRepository";

export type CaptureNotificationOccurrenceInput<
  Key extends NotificationEventKey,
> = {
  aggregateId: string;
  aggregateType: string;
  context: NotificationEventContextByKey[Key];
  correlationId: string;
  eventKey: Key;
  occurrenceKey: string;
  recipients: readonly unknown[];
};

export async function captureNotificationOccurrence<
  Key extends NotificationEventKey,
>(
  transaction: NotificationOccurrenceTransaction,
  input: CaptureNotificationOccurrenceInput<Key>,
): Promise<NotificationOccurrenceWriteResult> {
  if (
    notificationEventCatalogue[input.eventKey].ruleEligibility !==
    "CONFIGURABLE"
  ) {
    throw new Error("System-only events require server-controlled delivery.");
  }
  const context = parseNotificationContext(input.eventKey, input.context);
  const recipients = normalizeNotificationRecipients(input.recipients);

  return insertNotificationOccurrence(transaction, {
    ...input,
    context,
    recipients,
  });
}
