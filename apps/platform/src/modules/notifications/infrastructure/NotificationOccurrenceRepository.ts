import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { notificationDeliveries, notificationOutbox } from "@/db/schema";
import type {
  NotificationEventContextByKey,
  NotificationEventKey,
} from "../domain/NotificationEvent";
import {
  assertRequiredNotificationRecipients,
  type NotificationRecipientRequirement,
} from "../domain/NotificationRecipientRequirement";
import type { NotificationOutboxState } from "../domain/NotificationDelivery";
import {
  recipientsOfType,
  type NormalizedNotificationRecipient,
} from "../domain/NotificationOccurrence";
import type { NotificationRecipientType } from "../domain/NotificationRecipient";

export type NotificationOccurrenceTransaction = Parameters<
  Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]
>[0];

export type InsertNotificationOccurrenceInput<
  Key extends NotificationEventKey,
> = {
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
  eventDisplayName: string;
  eventEnabled: boolean;
  eventId: string;
  recipientId: string | null;
  recipientRequired: boolean | null;
  recipientTargetLabel: string | null;
  recipientType: string | null;
  ruleEnabled: boolean | null;
  targetEmail: string | null;
  targetName: string | null;
  targetUserId: string | null;
};

async function loadEventConfiguration(
  transaction: NotificationOccurrenceTransaction,
  eventKey: NotificationEventKey,
): Promise<EventConfigurationRow[]> {
  const result = await transaction.execute<EventConfigurationRow>(sql`
    SELECT channel.is_enabled AS "channelEnabled",
      channel.id AS "channelId",
      event.display_name AS "eventDisplayName",
      event.is_enabled AS "eventEnabled",
      event.id AS "eventId",
      recipient.id AS "recipientId",
      recipient.is_required AS "recipientRequired",
      COALESCE(recipient_role.name, target_user.display_name,
        recipient.recipient_type) AS "recipientTargetLabel",
      recipient.recipient_type AS "recipientType",
      rule.is_enabled AS "ruleEnabled",
      COALESCE(target_user.email, role_user.email) AS "targetEmail",
      COALESCE(target_user.display_name, role_user.display_name) AS "targetName",
      COALESCE(target_user.id, role_user.id) AS "targetUserId"
    FROM app_notification_events event
    LEFT JOIN app_notification_event_rules rule ON rule.event_id = event.id
    LEFT JOIN app_notification_event_rule_recipients recipient
      ON recipient.rule_id = rule.id
    LEFT JOIN app_notification_event_rule_channels binding
      ON binding.rule_recipient_id = recipient.id
    LEFT JOIN app_notification_channels channel ON channel.id = binding.channel_id
    LEFT JOIN app_users target_user
      ON target_user.id = recipient.recipient_user_id
      AND target_user.status = 'active'
    LEFT JOIN app_roles recipient_role
      ON recipient_role.id = recipient.recipient_role_id
    LEFT JOIN app_user_roles targeted_user_role
      ON targeted_user_role.role_id = recipient.recipient_role_id
      AND EXISTS (
        SELECT 1 FROM app_users eligible_role_user
        WHERE eligible_role_user.id = targeted_user_role.user_id
          AND eligible_role_user.status = 'active'
      )
    LEFT JOIN app_users role_user
      ON role_user.id = targeted_user_role.user_id
      AND role_user.status = 'active'
    WHERE event.event_key = ${eventKey}
      AND event.rule_eligibility = 'CONFIGURABLE'
  `);
  return result.rows;
}

function enabledBindings(rows: readonly EventConfigurationRow[]) {
  if (!rows[0]?.eventEnabled) return [];
  return rows.filter(
    (row) =>
      row.ruleEnabled &&
      row.channelEnabled &&
      row.channelId &&
      row.recipientType,
  );
}

function toRecipientRequirements(
  bindings: readonly EventConfigurationRow[],
  recipients: readonly NormalizedNotificationRecipient[],
  eventKey: NotificationEventKey,
): NotificationRecipientRequirement[] {
  return bindings.map((binding) => ({
    candidateUserIds: resolveBindingRecipients(
      binding,
      recipients,
      new Set(),
    ).map((recipient) => recipient.userId),
    eventDisplayName: binding.eventDisplayName,
    eventKey,
    recipientId: binding.recipientId!,
    recipientTargetLabel:
      binding.recipientTargetLabel ?? binding.recipientType!,
    recipientType: binding.recipientType!,
    required: binding.recipientRequired ?? false,
  }));
}

function resolveBindingRecipients(
  binding: EventConfigurationRow,
  recipients: readonly NormalizedNotificationRecipient[],
  excludedRecipientUserIds: ReadonlySet<string>,
) {
  if (
    binding.recipientType === "APPLICATION_OWNER" ||
    binding.recipientType === "ASSIGNED_USER" ||
    binding.recipientType === "ACTION_ACTOR" ||
    binding.recipientType === "FUNDING_CALL_STAKEHOLDER"
  ) {
    return recipientsOfType(
      recipients,
      binding.recipientType as NotificationRecipientType,
    ).filter((recipient) => !excludedRecipientUserIds.has(recipient.userId));
  }
  if (!binding.targetEmail || !binding.targetName || !binding.targetUserId)
    return [];
  if (excludedRecipientUserIds.has(binding.targetUserId)) return [];
  return [
    {
      displayName: binding.targetName,
      email: binding.targetEmail,
      normalizedEmail: binding.targetEmail.trim().toLowerCase(),
      recipientType: binding.recipientType as NotificationRecipientType,
      resolutionPath:
        binding.recipientType === "SPECIFIC_ROLE"
          ? "notification-rule:specific-role"
          : "notification-rule:specific-user",
      userId: binding.targetUserId,
    },
  ];
}

export async function insertNotificationOccurrence<
  Key extends NotificationEventKey,
>(
  transaction: NotificationOccurrenceTransaction,
  input: InsertNotificationOccurrenceInput<Key>,
): Promise<NotificationOccurrenceWriteResult> {
  const configuration = await loadEventConfiguration(
    transaction,
    input.eventKey,
  );
  if (configuration.length === 0) {
    throw new Error(`Notification event is not configured: ${input.eventKey}`);
  }

  const bindings = enabledBindings(configuration);
  const excludedRecipientUserIds = new Set(
    "excludedRecipientUserIds" in input.context &&
      Array.isArray(input.context.excludedRecipientUserIds)
      ? input.context.excludedRecipientUserIds
      : [],
  );
  assertRequiredNotificationRecipients(
    toRecipientRequirements(bindings, input.recipients, input.eventKey),
    excludedRecipientUserIds,
  );
  const status =
    bindings.length === 0 ? ("SENT" as const) : ("PENDING" as const);
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
      .where(
        and(
          eq(notificationOutbox.eventKey, input.eventKey),
          eq(notificationOutbox.occurrenceKey, input.occurrenceKey),
        ),
      )
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

  const deliveryMap = new Map<
    string,
    typeof notificationDeliveries.$inferInsert
  >();
  for (const binding of bindings) {
    for (const recipient of resolveBindingRecipients(
      binding,
      input.recipients,
      excludedRecipientUserIds,
    )) {
      const deliveryKey = `${binding.channelId}:${recipient.normalizedEmail}`;
      if (deliveryMap.has(deliveryKey)) continue;
      deliveryMap.set(deliveryKey, {
        channelId: binding.channelId!,
        outboxId: inserted.id,
        recipientEmail: recipient.email,
        recipientName: recipient.displayName,
        recipientType: recipient.recipientType,
        recipientUserId: recipient.userId,
        resolutionPath: recipient.resolutionPath,
      });
    }
  }
  const deliveries = [...deliveryMap.values()];
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
