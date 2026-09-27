import { z } from "zod";

import {
  notificationErrorCodes,
  NotificationValidationError,
} from "./NotificationErrors";
import type { NotificationRecipientType } from "./NotificationRecipient";

export const notificationCaptureRecipientSchema = z.object({
  displayName: z.string().trim().min(1).max(200),
  email: z.email().max(320),
  recipientType: z.enum(["APPLICATION_OWNER", "ASSIGNED_USER"]),
  resolutionPath: z.string().trim().min(1).max(200),
  userId: z.uuid(),
}).strict();

export type NotificationCaptureRecipient = z.infer<
  typeof notificationCaptureRecipientSchema
>;

export type NormalizedNotificationRecipient = NotificationCaptureRecipient & {
  normalizedEmail: string;
};

export function normalizeNotificationRecipients(
  recipients: readonly unknown[],
): NormalizedNotificationRecipient[] {
  const uniqueRecipients = new Map<string, NormalizedNotificationRecipient>();

  for (const input of recipients) {
    const result = notificationCaptureRecipientSchema.safeParse(input);
    if (!result.success) {
      throw new NotificationValidationError(
        notificationErrorCodes.invalidRecipient,
        "Invalid notification recipient snapshot.",
        result.error.issues.map((issue) => ({
          message: issue.message,
          path: issue.path.join("."),
        })),
      );
    }
    const recipient = result.data;
    const normalizedEmail = recipient.email.trim().toLowerCase();
    if (!uniqueRecipients.has(normalizedEmail)) {
      uniqueRecipients.set(normalizedEmail, {
        ...recipient,
        email: recipient.email.trim(),
        normalizedEmail,
      });
    }
  }

  return [...uniqueRecipients.values()];
}

export function recipientsOfType(
  recipients: readonly NormalizedNotificationRecipient[],
  recipientType: NotificationRecipientType,
) {
  return recipients.filter(
    (recipient) => recipient.recipientType === recipientType,
  );
}
