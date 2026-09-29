import "server-only";

import {
  authenticationEventContextSchema,
  type AuthenticationEventKey,
} from "../domain/NotificationEvent";
import { insertAuthenticationNotification } from "../infrastructure/AuthenticationNotificationRepository";

export async function queueAuthenticationEmail(
  eventKey: AuthenticationEventKey,
  recipient: {
    firebaseUid: string;
    recipientEmail: string;
    recipientName: string;
  },
) {
  const context = authenticationEventContextSchema.parse({
    firebaseUid: recipient.firebaseUid,
    recipientEmail: recipient.recipientEmail,
  });
  await insertAuthenticationNotification(
    eventKey,
    context,
    recipient.recipientName,
  );
}
