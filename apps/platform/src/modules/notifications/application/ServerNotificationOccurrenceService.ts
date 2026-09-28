import "server-only";

import {
  assertRecipientCompatibility,
  parseNotificationContext,
  type NotificationEventContextByKey,
  type NotificationEventKey,
} from "../domain/NotificationEvent";
import { normalizeNotificationRecipients } from "../domain/NotificationOccurrence";
import {
  insertNotificationOccurrence,
  type NotificationOccurrenceTransaction,
  type NotificationOccurrenceWriteResult,
} from "../infrastructure/NotificationOccurrenceRepository";

export type CaptureNotificationOccurrenceInput<Key extends NotificationEventKey> = {
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
  const context = parseNotificationContext(input.eventKey, input.context);
  const recipients = normalizeNotificationRecipients(input.recipients);

  for (const recipient of recipients) {
    assertRecipientCompatibility(input.eventKey, recipient.recipientType);
  }

  return insertNotificationOccurrence(transaction, {
    ...input,
    context,
    recipients,
  });
}
