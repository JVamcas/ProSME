import "server-only";

import { and, eq } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  notificationChannels,
  notificationDeliveries,
  notificationEventRuleChannels,
  notificationEventRuleRecipients,
  notificationEventRules,
  notificationEvents,
  notificationOutbox,
} from "@/db/schema";
import type {
  NotificationEventContextByKey,
  NotificationEventKey,
} from "../domain/NotificationEvent";
import {
  notificationErrorCodes,
  NotificationValidationError,
} from "../domain/NotificationErrors";
import type { NotificationOutboxState } from "../domain/NotificationDelivery";
import {
  recipientsOfType,
  type NormalizedNotificationRecipient,
} from "../domain/NotificationOccurrence";
import type { NotificationRecipientType } from "../domain/NotificationRecipient";

export type NotificationOccurrenceTransaction = Parameters<
  Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]
>[0];

export type InsertNotificationOccurrenceInput<Key extends NotificationEventKey> = {
  aggregateId: string;
  aggregateType: string;
  context: NotificationEventContextByKey[Key];
  correlationId: string;
  eventKey: Key;
  occurrenceKey: string;
  recipients: readonly NormalizedNotificationRecipient[];
};

export type NotificationOccurrenceWriteResult = {
  created: boolean;
  deliveryCount: number;
  id: string;
  status: NotificationOutboxState;
};

type EventConfigurationRow = {
  channelEnabled: boolean | null;
  channelId: string | null;
  eventEnabled: boolean;
  eventId: string;
  recipientRequired: boolean | null;
  recipientType: string | null;
  ruleEnabled: boolean | null;
};

async function loadEventConfiguration(
  transaction: NotificationOccurrenceTransaction,
  eventKey: NotificationEventKey,
): Promise<EventConfigurationRow[]> {
  return transaction
    .select({
      channelEnabled: notificationChannels.isEnabled,
      channelId: notificationChannels.id,
      eventEnabled: notificationEvents.isEnabled,
      eventId: notificationEvents.id,
      recipientRequired: notificationEventRuleRecipients.isRequired,
      recipientType: notificationEventRuleRecipients.recipientType,
      ruleEnabled: notificationEventRules.isEnabled,
    })
    .from(notificationEvents)
    .leftJoin(
      notificationEventRules,
      eq(notificationEventRules.eventId, notificationEvents.id),
    )
    .leftJoin(
      notificationEventRuleRecipients,
      eq(
        notificationEventRuleRecipients.ruleId,
        notificationEventRules.id,
      ),
    )
    .leftJoin(
      notificationEventRuleChannels,
      eq(
        notificationEventRuleChannels.ruleRecipientId,
        notificationEventRuleRecipients.id,
      ),
    )
    .leftJoin(
      notificationChannels,
      eq(notificationChannels.id, notificationEventRuleChannels.channelId),
    )
    .where(eq(notificationEvents.eventKey, eventKey));
}

function enabledBindings(rows: readonly EventConfigurationRow[]) {
  if (!rows[0]?.eventEnabled) return [];
  return rows.filter((row) => (
    row.ruleEnabled
    && row.channelEnabled
    && row.channelId
    && row.recipientType
  ));
}

function assertRequiredRecipients(
  bindings: readonly EventConfigurationRow[],
  recipients: readonly NormalizedNotificationRecipient[],
) {
  for (const binding of bindings) {
    if (
      binding.recipientRequired
      && recipientsOfType(
        recipients,
        binding.recipientType as NotificationRecipientType,
      ).length === 0
    ) {
      throw new NotificationValidationError(
        notificationErrorCodes.invalidRecipient,
        `Notification event requires recipient type ${binding.recipientType}.`,
      );
    }
  }
}

export async function insertNotificationOccurrence<Key extends NotificationEventKey>(
  transaction: NotificationOccurrenceTransaction,
  input: InsertNotificationOccurrenceInput<Key>,
): Promise<NotificationOccurrenceWriteResult> {
  const configuration = await loadEventConfiguration(transaction, input.eventKey);
  if (configuration.length === 0) {
    throw new Error(`Notification event is not configured: ${input.eventKey}`);
  }

  const bindings = enabledBindings(configuration);
  assertRequiredRecipients(bindings, input.recipients);
  const status = bindings.length === 0 ? "SENT" as const : "PENDING" as const;
  const [inserted] = await transaction
    .insert(notificationOutbox)
    .values({
      aggregateId: input.aggregateId,
      aggregateType: input.aggregateType,
      context: input.context,
      correlationId: input.correlationId,
      eventId: configuration[0]!.eventId,
      eventKey: input.eventKey,
      occurrenceKey: input.occurrenceKey,
      processedAt: status === "SENT" ? new Date() : null,
      status,
    })
    .onConflictDoNothing({
      target: [notificationOutbox.eventKey, notificationOutbox.occurrenceKey],
    })
    .returning({ id: notificationOutbox.id });

  if (!inserted) {
    const [existing] = await transaction
      .select({ id: notificationOutbox.id, status: notificationOutbox.status })
      .from(notificationOutbox)
      .where(and(
        eq(notificationOutbox.eventKey, input.eventKey),
        eq(notificationOutbox.occurrenceKey, input.occurrenceKey),
      ))
      .limit(1);
    if (!existing) {
      throw new Error("Notification occurrence replay could not be loaded.");
    }
    return {
      created: false,
      deliveryCount: 0,
      id: existing.id,
      status: existing.status,
    };
  }

  const deliveries = bindings.flatMap((binding) =>
    recipientsOfType(
      input.recipients,
      binding.recipientType as NotificationRecipientType,
    ).map((recipient) => ({
      channelId: binding.channelId!,
      outboxId: inserted.id,
      recipientEmail: recipient.email,
      recipientName: recipient.displayName,
      recipientType: recipient.recipientType,
      recipientUserId: recipient.userId,
      resolutionPath: recipient.resolutionPath,
    })),
  );
  if (deliveries.length > 0) {
    await transaction.insert(notificationDeliveries).values(deliveries);
  }

  return {
    created: true,
    deliveryCount: deliveries.length,
    id: inserted.id,
    status,
  };
}
