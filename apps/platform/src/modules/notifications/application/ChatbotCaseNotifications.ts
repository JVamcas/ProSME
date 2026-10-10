import "server-only";
import { captureNotificationOccurrence } from "./ServerNotificationOccurrenceService";
import type { DatabaseTransaction } from "@/platform/database/client";
import { chatbotDeliveryRecipientAuthorized } from "../infrastructure/ChatbotNotificationRecipientRepository";
import {
  notificationErrorCodes,
  NotificationValidationError,
} from "../domain/NotificationErrors";
import type { ChatbotCaseEvent } from "../domain/NotificationChatbotEvent";

export function captureChatbotCaseNotification(
  transaction: DatabaseTransaction,
  caseId: string,
  recipientUserIds: string[],
  caseReference: string,
) {
  return captureNotificationOccurrence(transaction, {
    aggregateId: caseId,
    aggregateType: "CHATBOT_CASE",
    correlationId: caseId,
    eventKey: "chatbot.case.created",
    occurrenceKey: `chatbot-case:${caseId}`,
    context: {
      caseId,
      caseReference,
      occurredAt: new Date().toISOString(),
      recipientUserIds,
    },
    recipients: [],
  });
}

export async function requireChatbotDeliveryRecipient(
  context: ChatbotCaseEvent,
  userId: string,
  email: string,
  ruleId: string | null,
) {
  if (
    !(await chatbotDeliveryRecipientAuthorized(
      context.caseId,
      userId,
      email,
      context.recipientUserIds,
      ruleId,
    ))
  )
    throw new NotificationValidationError(
      notificationErrorCodes.invalidRecipient,
      "The recipient cannot access this support case.",
    );
}
