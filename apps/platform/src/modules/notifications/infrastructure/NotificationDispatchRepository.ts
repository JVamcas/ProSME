import "server-only";

import { sql } from "drizzle-orm";

import { getDatabase } from "@/platform/database/client";
import type {
  NotificationEventContextByKey,
  NotificationEventKey,
} from "../domain/NotificationEvent";
import type { NotificationErrorCode } from "../domain/NotificationErrors";

export type ClaimedNotificationOccurrence = {
  correlationId: string;
  eventKey: NotificationEventKey;
  id: string;
};

export type ClaimedNotificationDelivery = {
  attemptCount: number;
  context: NotificationEventContextByKey[NotificationEventKey];
  correlationId: string;
  deliveryId: string;
  eventKey: NotificationEventKey;
  htmlTemplate: string | null;
  outboxId: string;
  plainTextTemplate: string | null;
  recipientEmail: string;
  recipientName: string;
  recipientUserId: string | null;
  subjectTemplate: string | null;
  templateVersionId: string | null;
};

export async function claimDueNotificationOccurrences(input: {
  batchSize: number;
  lockTimeoutMs: number;
  now: Date;
  owner: string;
}): Promise<ClaimedNotificationOccurrence[]> {
  return getDatabase().transaction(async (transaction) => {
    const staleBefore = new Date(input.now.getTime() - input.lockTimeoutMs);
    const result = await transaction.execute<ClaimedNotificationOccurrence>(sql`
      WITH due AS (
        SELECT occurrence.id
        FROM app_notification_outbox occurrence
        WHERE (
          occurrence.status IN ('PENDING', 'PARTIALLY_SENT')
          AND occurrence.available_at <= ${input.now}
          AND EXISTS (
            SELECT 1
            FROM app_notification_deliveries delivery
            JOIN app_notification_channels channel
              ON channel.id = delivery.channel_id
            WHERE delivery.outbox_id = occurrence.id
              AND (channel.is_enabled = true OR EXISTS (
                SELECT 1 FROM app_notification_events protected_event
                WHERE protected_event.id = occurrence.event_id
                  AND protected_event.rule_eligibility = 'SYSTEM_ONLY'
              ))
              AND delivery.status IN ('PENDING', 'PROCESSING')
              AND (
                delivery.status = 'PROCESSING'
                OR delivery.next_attempt_at <= ${input.now}
              )
          )
        ) OR (
          occurrence.status = 'PROCESSING'
          AND occurrence.locked_at <= ${staleBefore}
        )
        ORDER BY occurrence.available_at, occurrence.id
        FOR UPDATE OF occurrence SKIP LOCKED
        LIMIT ${input.batchSize}
      )
      UPDATE app_notification_outbox occurrence
      SET status = 'PROCESSING',
        locked_at = ${input.now},
        locked_by = ${input.owner},
        attempt_count = occurrence.attempt_count + 1,
        updated_at = ${input.now}
      FROM due
      WHERE occurrence.id = due.id
      RETURNING occurrence.id,
        occurrence.event_key AS "eventKey",
        occurrence.correlation_id AS "correlationId"
    `);
    return result.rows as ClaimedNotificationOccurrence[];
  });
}

export async function loadClaimedNotificationDeliveries(input: {
  now: Date;
  outboxIds: readonly string[];
  owner: string;
}): Promise<ClaimedNotificationDelivery[]> {
  if (input.outboxIds.length === 0) return [];
  const identifiers = sql.join(
    input.outboxIds.map((id) => sql`${id}::uuid`),
    sql`, `,
  );
  const result = await getDatabase().execute<ClaimedNotificationDelivery>(sql`
    SELECT delivery.id AS "deliveryId",
      delivery.outbox_id AS "outboxId",
      delivery.recipient_user_id AS "recipientUserId",
      delivery.recipient_name AS "recipientName",
      delivery.recipient_email AS "recipientEmail",
      delivery.attempt_count AS "attemptCount",
      occurrence.event_key AS "eventKey",
      occurrence.context,
      occurrence.correlation_id AS "correlationId",
      template.id AS "templateVersionId",
      template.subject_template AS "subjectTemplate",
      template.html_template AS "htmlTemplate",
      template.plain_text_template AS "plainTextTemplate"
    FROM app_notification_deliveries delivery
    JOIN app_notification_outbox occurrence
      ON occurrence.id = delivery.outbox_id
    JOIN app_notification_channels channel
      ON channel.id = delivery.channel_id
    JOIN app_notification_events occurrence_event ON occurrence_event.id = occurrence.event_id
    LEFT JOIN LATERAL (
      SELECT version.id, version.subject_template, version.html_template,
        version.plain_text_template
      FROM app_notification_template_targets target
      JOIN app_notification_template_versions version
        ON version.template_target_id = target.id
        AND (
          (occurrence.event_key IN ('reporting.website.biweekly', 'reporting.website.monthly')
            AND version.id = delivery.template_version_id AND version.status IN ('PUBLISHED', 'RETIRED'))
          OR (occurrence.event_key NOT IN ('reporting.website.biweekly', 'reporting.website.monthly')
            AND version.status = 'PUBLISHED')
        )
      JOIN app_notification_events event
        ON event.id = occurrence.event_id
      WHERE target.channel_id = delivery.channel_id
        AND (target.is_enabled = true OR occurrence_event.rule_eligibility = 'SYSTEM_ONLY')
        AND (
          (target.scope = 'EVENT' AND target.event_id = occurrence.event_id)
          OR (target.scope = 'CATALOG' AND target.catalog_id = event.catalog_id)
          OR target.scope = 'GLOBAL'
        )
        AND (occurrence_event.rule_eligibility = 'CONFIGURABLE' OR target.scope IN ('EVENT', 'CATALOG'))
      ORDER BY CASE target.scope
        WHEN 'EVENT' THEN 1 WHEN 'CATALOG' THEN 2 ELSE 3 END
      LIMIT 1
    ) template ON true
    WHERE occurrence.id IN (${identifiers})
      AND occurrence.status = 'PROCESSING'
      AND occurrence.locked_by = ${input.owner}
      AND (channel.is_enabled = true OR occurrence_event.rule_eligibility = 'SYSTEM_ONLY')
      AND delivery.status IN ('PENDING', 'PROCESSING')
      AND (
        delivery.status = 'PROCESSING'
        OR delivery.next_attempt_at <= ${input.now}
      )
    ORDER BY occurrence.available_at, occurrence.id, delivery.id
  `);
  return result.rows as ClaimedNotificationDelivery[];
}

export async function beginNotificationDeliveryAttempt(input: {
  deliveryId: string;
  now: Date;
  owner: string;
}): Promise<number | undefined> {
  const result = await getDatabase().execute<{ attemptCount: number }>(sql`
    UPDATE app_notification_deliveries delivery
    SET status = 'PROCESSING',
      attempt_count = delivery.attempt_count + 1,
      updated_at = ${input.now}
    WHERE delivery.id = ${input.deliveryId}::uuid
      AND EXISTS (
        SELECT 1 FROM app_notification_outbox occurrence
        WHERE occurrence.id = delivery.outbox_id
          AND occurrence.status = 'PROCESSING'
          AND occurrence.locked_by = ${input.owner}
      )
    RETURNING delivery.attempt_count AS "attemptCount"
  `);
  return (result.rows[0] as { attemptCount: number } | undefined)?.attemptCount;
}

export async function recordNotificationDeliverySuccess(input: {
  deliveryId: string;
  now: Date;
  owner: string;
  providerMessageId: string;
  templateVersionId: string | null;
}) {
  await getDatabase().execute(sql`
    UPDATE app_notification_deliveries delivery
    SET status = 'SENT',
      template_version_id = ${input.templateVersionId}::uuid,
      provider_message_id = ${input.providerMessageId},
      last_error_code = NULL,
      last_error_message = NULL,
      sent_at = ${input.now},
      updated_at = ${input.now}
    WHERE delivery.id = ${input.deliveryId}::uuid
      AND EXISTS (
        SELECT 1 FROM app_notification_outbox occurrence
        WHERE occurrence.id = delivery.outbox_id
          AND occurrence.status = 'PROCESSING'
          AND occurrence.locked_by = ${input.owner}
      )
  `);
}

export async function recordNotificationDeliveryFailure(input: {
  code: NotificationErrorCode;
  deadLetter: boolean;
  deliveryId: string;
  nextAttemptAt: Date;
  now: Date;
  owner: string;
  retry: boolean;
  templateVersionId: string | null;
}) {
  await getDatabase().execute(sql`
    UPDATE app_notification_deliveries delivery
    SET status = ${input.retry
      ? "PENDING"
      : input.deadLetter
        ? "DEAD_LETTER"
        : "FAILED"},
      template_version_id = ${input.templateVersionId}::uuid,
      last_error_code = ${input.code},
      last_error_message = ${"Delivery failed; see the stable error code."},
      next_attempt_at = ${input.nextAttemptAt},
      updated_at = ${input.now}
    WHERE delivery.id = ${input.deliveryId}::uuid
      AND EXISTS (
        SELECT 1 FROM app_notification_outbox occurrence
        WHERE occurrence.id = delivery.outbox_id
          AND occurrence.status = 'PROCESSING'
          AND occurrence.locked_by = ${input.owner}
      )
  `);
}

export async function finalizeClaimedNotificationOccurrence(input: {
  now: Date;
  outboxId: string;
  owner: string;
}) {
  await getDatabase().execute(sql`
    WITH summary AS (
      SELECT count(*)::integer AS total,
        count(*) FILTER (WHERE status = 'SENT')::integer AS sent,
        count(*) FILTER (WHERE status = 'FAILED')::integer AS failed,
        count(*) FILTER (WHERE status = 'DEAD_LETTER')::integer AS dead_letter,
        count(*) FILTER (WHERE status IN ('PENDING', 'PROCESSING'))::integer AS pending,
        min(next_attempt_at) FILTER (
          WHERE status IN ('PENDING', 'PROCESSING')
        ) AS next_attempt_at
      FROM app_notification_deliveries
      WHERE outbox_id = ${input.outboxId}::uuid
    ), last_failure AS (
      SELECT last_error_code, last_error_message
      FROM app_notification_deliveries
      WHERE outbox_id = ${input.outboxId}::uuid
        AND last_error_code IS NOT NULL
      ORDER BY updated_at DESC, id DESC
      LIMIT 1
    )
    UPDATE app_notification_outbox occurrence
    SET status = CASE
        WHEN summary.pending > 0 AND summary.sent > 0 THEN 'PARTIALLY_SENT'
        WHEN summary.pending > 0 THEN 'PENDING'
        WHEN summary.sent = summary.total THEN 'SENT'
        WHEN summary.sent > 0 AND (summary.failed > 0 OR summary.dead_letter > 0)
          THEN 'PARTIALLY_SENT'
        WHEN summary.dead_letter > 0 THEN 'DEAD_LETTER'
        ELSE 'FAILED'
      END,
      available_at = COALESCE(summary.next_attempt_at, occurrence.available_at),
      processed_at = CASE
        WHEN summary.pending = 0 THEN ${input.now}::timestamptz
        ELSE NULL::timestamptz
      END,
      last_error_code = last_failure.last_error_code,
      last_error_message = last_failure.last_error_message,
      locked_at = NULL,
      locked_by = NULL,
      updated_at = ${input.now}
    FROM summary
    LEFT JOIN last_failure ON true
    WHERE occurrence.id = ${input.outboxId}::uuid
      AND occurrence.status = 'PROCESSING'
      AND occurrence.locked_by = ${input.owner}
  `);
}
