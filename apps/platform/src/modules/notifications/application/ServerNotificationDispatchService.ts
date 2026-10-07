import { requireCurrentWebsiteReportRecipient } from "./ServerWebsiteReportDeliveryPolicy";
import "server-only";

import { randomUUID } from "node:crypto";

import { logger } from "@/integrations/monitoring/logger";
import {
  notificationErrorCodes,
  NotificationValidationError,
  type NotificationErrorCode,
} from "../domain/NotificationErrors";
import {
  isNotificationEventKey,
  notificationEventCatalogue,
  parseNotificationContext,
} from "../domain/NotificationEvent";
import { notificationEventTemplateFields } from "../domain/NotificationTemplateFields";
import { deliveryFailureOutcome } from "../domain/NotificationRetryPolicy";
import { createGmailSmtpEmailSender } from "../infrastructure/GmailSmtpEmailSender";
import {
  beginNotificationDeliveryAttempt,
  claimDueNotificationOccurrences,
  finalizeClaimedNotificationOccurrence,
  loadClaimedNotificationDeliveries,
  recordNotificationDeliveryFailure,
  recordNotificationDeliverySuccess,
  type ClaimedNotificationDelivery,
} from "../infrastructure/NotificationDispatchRepository";
import { getGmailSmtpConfiguration } from "../infrastructure/NotificationSmtpConfiguration";
import { renderAuthenticationEmail } from "./ServerAuthenticationEmailContentService";
import {
  NotificationEmailSendError,
  type NotificationEmailSender,
} from "./NotificationEmailSender";
import { getNotificationProcessorConfiguration } from "./NotificationProcessorConfiguration";
import { renderNotificationTemplate } from "./NotificationTemplateRenderer";
import { buildServerNotificationRenderValues } from "./ServerNotificationRenderValues";
import { loadNotificationBrandingLogoAttachment } from "./ServerNotificationEmailBranding";

export type NotificationBatchResult = {
  claimed: number;
  failed: number;
  processed: number;
  retrying: number;
  sent: number;
};

type ProcessorDependencies = {
  batchSize: number;
  emailSender: NotificationEmailSender;
  executionTimeoutMs: number;
  lockTimeoutMs: number;
  now?: () => Date;
  owner?: string;
  random?: () => number;
};

function controlledFailure(error: unknown): {
  code: NotificationErrorCode;
  retryable: boolean;
} {
  if (error instanceof NotificationEmailSendError) {
    return { code: error.code, retryable: error.retryable };
  }
  if (error instanceof NotificationValidationError) {
    return { code: error.code, retryable: false };
  }
  return {
    code: notificationErrorCodes.providerUnavailable,
    retryable: true,
  };
}

async function dispatchDelivery(input: {
  brandingAttachment: ReturnType<typeof loadNotificationBrandingLogoAttachment>;
  delivery: ClaimedNotificationDelivery;
  emailSender: NotificationEmailSender;
  now: Date;
  owner: string;
  random: () => number;
}): Promise<"failed" | "retrying" | "sent"> {
  const attemptNumber = await beginNotificationDeliveryAttempt({
    deliveryId: input.delivery.deliveryId,
    now: input.now,
    owner: input.owner,
  });
  if (!attemptNumber) return "failed";

  try {
    await requireCurrentWebsiteReportRecipient(input.delivery);
    const systemOnly =
      isNotificationEventKey(input.delivery.eventKey) &&
      notificationEventCatalogue[input.delivery.eventKey].ruleEligibility ===
        "SYSTEM_ONLY";
    if (
      !systemOnly &&
      (!input.delivery.templateVersionId ||
        !input.delivery.subjectTemplate ||
        !input.delivery.htmlTemplate ||
        !input.delivery.plainTextTemplate)
    ) {
      throw new NotificationValidationError(
        notificationErrorCodes.templateUnavailable,
        "No published notification template is available.",
      );
    }
    if (!isNotificationEventKey(input.delivery.eventKey)) {
      throw new NotificationValidationError(
        notificationErrorCodes.unknownEvent,
        "The notification event is not supported.",
      );
    }
    if (!systemOnly && !input.delivery.recipientUserId) {
      throw new NotificationValidationError(
        notificationErrorCodes.invalidRecipient,
        "The notification recipient is no longer available.",
      );
    }
    const context = parseNotificationContext(
      input.delivery.eventKey,
      input.delivery.context,
    );
    const rendered = systemOnly
      ? await renderAuthenticationEmail(
          input.delivery,
          context as { firebaseUid: string; recipientEmail: string },
        )
      : renderNotificationTemplate(
          {
            htmlTemplate: input.delivery.htmlTemplate!,
            plainTextTemplate: input.delivery.plainTextTemplate!,
            subjectTemplate: input.delivery.subjectTemplate!,
          },
          notificationEventTemplateFields[input.delivery.eventKey],
          buildServerNotificationRenderValues({
            context,
            eventKey: input.delivery.eventKey,
            recipient: {
              displayName: input.delivery.recipientName,
              userId: input.delivery.recipientUserId!,
            },
          }),
        );
    const result = await input.emailSender.send({
      ...rendered,
      attachments: [await input.brandingAttachment],
      to: input.delivery.recipientEmail,
    });
    await recordNotificationDeliverySuccess({
      deliveryId: input.delivery.deliveryId,
      now: input.now,
      owner: input.owner,
      providerMessageId: result.providerMessageId,
      templateVersionId: input.delivery.templateVersionId,
    });
    return "sent";
  } catch (error) {
    const failure = controlledFailure(error);
    const outcome = deliveryFailureOutcome({
      attemptNumber,
      code: failure.code,
      jitter: input.random(),
      now: input.now,
      retryable: failure.retryable,
    });
    await recordNotificationDeliveryFailure({
      code: outcome.code,
      deadLetter: outcome.code === notificationErrorCodes.retryExhausted,
      deliveryId: input.delivery.deliveryId,
      nextAttemptAt: outcome.nextAttemptAt,
      now: input.now,
      owner: input.owner,
      retry: outcome.retry,
      templateVersionId: input.delivery.templateVersionId,
    });
    logger.warn("notification.delivery.failed", {
      code: outcome.code,
      correlationId: input.delivery.correlationId,
      deliveryId: input.delivery.deliveryId,
      occurrenceId: input.delivery.outboxId,
      retrying: outcome.retry,
    });
    return outcome.retry ? "retrying" : "failed";
  }
}

export async function processNotificationBatch(
  dependencies: ProcessorDependencies,
): Promise<NotificationBatchResult> {
  const now = dependencies.now ?? (() => new Date());
  const random = dependencies.random ?? Math.random;
  const owner = dependencies.owner ?? randomUUID();
  const startedAt = now();
  const deadline = startedAt.getTime() + dependencies.executionTimeoutMs;
  const occurrences = await claimDueNotificationOccurrences({
    batchSize: dependencies.batchSize,
    lockTimeoutMs: dependencies.lockTimeoutMs,
    now: startedAt,
    owner,
  });
  const deliveries = await loadClaimedNotificationDeliveries({
    now: startedAt,
    outboxIds: occurrences.map((occurrence) => occurrence.id),
    owner,
  });
  const result: NotificationBatchResult = {
    claimed: occurrences.length,
    failed: 0,
    processed: 0,
    retrying: 0,
    sent: 0,
  };
  const brandingAttachment = deliveries.length
    ? loadNotificationBrandingLogoAttachment()
    : undefined;

  for (const delivery of deliveries) {
    if (now().getTime() >= deadline) break;
    const outcome = await dispatchDelivery({
      brandingAttachment: brandingAttachment!,
      delivery,
      emailSender: dependencies.emailSender,
      now: now(),
      owner,
      random,
    });
    result[outcome] += 1;
    result.processed += 1;
  }

  await Promise.all(
    occurrences.map((occurrence) =>
      finalizeClaimedNotificationOccurrence({
        now: now(),
        outboxId: occurrence.id,
        owner,
      }),
    ),
  );
  return result;
}

export async function processConfiguredNotificationBatch() {
  const processor = getNotificationProcessorConfiguration();
  return processNotificationBatch({
    batchSize: processor.NOTIFICATION_PROCESSOR_BATCH_SIZE,
    emailSender: createGmailSmtpEmailSender(getGmailSmtpConfiguration()),
    executionTimeoutMs: processor.NOTIFICATION_PROCESSOR_EXECUTION_TIMEOUT_MS,
    lockTimeoutMs: processor.NOTIFICATION_PROCESSOR_LOCK_TIMEOUT_MS,
    now: () => new Date(),
    owner: randomUUID(),
  });
}
