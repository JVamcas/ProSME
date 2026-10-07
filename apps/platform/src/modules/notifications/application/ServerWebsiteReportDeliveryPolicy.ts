import "server-only";
import { isCurrentWebsiteReportRecipient } from "../infrastructure/WebsiteReportRecipientRepository";
import {
  notificationErrorCodes,
  NotificationValidationError,
} from "../domain/NotificationErrors";

export async function requireCurrentWebsiteReportRecipient(input: {
  eventKey: string;
  recipientUserId: string | null;
  recipientEmail: string;
}) {
  if (!input.eventKey.startsWith("reporting.website.")) return;
  const allowed =
    input.recipientUserId &&
    (await isCurrentWebsiteReportRecipient({
      eventKey: input.eventKey,
      userId: input.recipientUserId,
      email: input.recipientEmail,
    }));
  if (!allowed) {
    throw new NotificationValidationError(
      notificationErrorCodes.invalidRecipient,
      "The report recipient is no longer active, authorized or designated.",
    );
  }
}
