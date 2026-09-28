import "server-only";

import { sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { authorizationAuditEntries } from "@/db/schema";
import type {
  NotificationCatalogUpdate,
  NotificationDeliveryQuery,
  NotificationEventRuleUpdate,
} from "../api/NotificationAdministrationSchemas";
import type { NotificationAuditMetadata } from "../domain/NotificationAudit";

export async function listNotificationCatalogRecords() {
  const result = await getDatabase().execute(sql`
    SELECT catalog.catalog_key AS "catalogKey",
      catalog.display_name AS "displayName",
      catalog.description,
      catalog.sort_order AS "sortOrder",
      catalog.is_enabled AS "isEnabled",
      to_char(catalog.updated_at AT TIME ZONE 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.US') || 'Z' AS "updatedAt",
      count(event.id)::integer AS "eventCount"
    FROM app_notification_catalogs catalog
    LEFT JOIN app_notification_events event ON event.catalog_id = catalog.id
    GROUP BY catalog.id
    ORDER BY catalog.sort_order, catalog.catalog_key
  `);
  return result.rows;
}

export async function findNotificationCatalogRecord(catalogKey: string) {
  const result = await getDatabase().execute(sql`
    SELECT catalog.catalog_key AS "catalogKey",
      catalog.display_name AS "displayName",
      catalog.description,
      catalog.sort_order AS "sortOrder",
      catalog.is_enabled AS "isEnabled",
      to_char(catalog.updated_at AT TIME ZONE 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.US') || 'Z' AS "updatedAt",
      COALESCE(json_agg(json_build_object(
        'eventKey', event.event_key,
        'displayName', event.display_name,
        'description', event.description,
        'isEnabled', event.is_enabled
      ) ORDER BY event.event_key) FILTER (WHERE event.id IS NOT NULL), '[]') AS events
    FROM app_notification_catalogs catalog
    LEFT JOIN app_notification_events event ON event.catalog_id = catalog.id
    WHERE catalog.catalog_key = ${catalogKey}
    GROUP BY catalog.id
  `);
  return result.rows[0];
}

export async function updateNotificationCatalogRecord(input: {
  actorId: string;
  catalogKey: string;
  correlationId: string;
  update: NotificationCatalogUpdate;
}) {
  return getDatabase().transaction(async (transaction) => {
    const updated = await transaction.execute(sql`
      UPDATE app_notification_catalogs
      SET display_name = ${input.update.displayName},
        description = ${input.update.description},
        sort_order = ${input.update.sortOrder},
        is_enabled = ${input.update.isEnabled},
        updated_at = now()
      WHERE catalog_key = ${input.catalogKey}
        AND updated_at = ${input.update.expectedUpdatedAt}
      RETURNING catalog_key AS "catalogKey",
        to_char(updated_at AT TIME ZONE 'UTC',
          'YYYY-MM-DD"T"HH24:MI:SS.US') || 'Z' AS "updatedAt"
    `);
    if (!updated.rows[0]) return undefined;
    await transaction.insert(authorizationAuditEntries).values({
      action: "NOTIFICATION_CATALOG_UPDATED",
      actorId: input.actorId,
      changes: {
        catalogKey: input.catalogKey,
        correlationId: input.correlationId,
      } satisfies NotificationAuditMetadata,
    });
    return updated.rows[0];
  });
}

export async function listNotificationEventRuleRecords() {
  const result = await getDatabase().execute(sql`
    SELECT catalog.catalog_key AS "catalogKey",
      catalog.display_name AS "catalogName",
      event.event_key AS "eventKey",
      event.display_name AS "eventName",
      event.description AS "eventDescription",
      event.is_enabled AS "eventEnabled",
      rule.is_enabled AS "isEnabled",
      to_char(rule.updated_at AT TIME ZONE 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.US') || 'Z' AS "updatedAt",
      count(recipient.id)::integer AS "recipientCount"
    FROM app_notification_events event
    JOIN app_notification_catalogs catalog ON catalog.id = event.catalog_id
    JOIN app_notification_event_rules rule ON rule.event_id = event.id
    LEFT JOIN app_notification_event_rule_recipients recipient ON recipient.rule_id = rule.id
    GROUP BY catalog.id, event.id, rule.id
    ORDER BY catalog.sort_order, catalog.catalog_key, event.event_key
  `);
  return result.rows;
}

export async function findNotificationEventRuleRecord(eventKey: string) {
  const result = await getDatabase().execute(sql`
    SELECT catalog.catalog_key AS "catalogKey",
      event.event_key AS "eventKey",
      event.display_name AS "eventName",
      event.description AS "eventDescription",
      event.is_enabled AS "eventEnabled",
      rule.is_enabled AS "isEnabled",
      to_char(rule.updated_at AT TIME ZONE 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.US') || 'Z' AS "updatedAt",
      COALESCE(json_agg(json_build_object(
        'recipientType', recipient.recipient_type,
        'isRequired', recipient.is_required,
        'channelCodes', COALESCE((
          SELECT json_agg(channel.code ORDER BY channel.sort_order, channel.code)
          FROM app_notification_event_rule_channels binding
          JOIN app_notification_channels channel ON channel.id = binding.channel_id
          WHERE binding.rule_recipient_id = recipient.id
        ), '[]')
      ) ORDER BY recipient.recipient_type) FILTER (WHERE recipient.id IS NOT NULL), '[]') AS recipients,
      (SELECT COALESCE(json_agg(json_build_object(
        'code', channel.code,
        'displayName', channel.display_name,
        'isEnabled', channel.is_enabled
      ) ORDER BY channel.sort_order, channel.code), '[]')
      FROM app_notification_channels channel) AS channels
    FROM app_notification_events event
    JOIN app_notification_catalogs catalog ON catalog.id = event.catalog_id
    JOIN app_notification_event_rules rule ON rule.event_id = event.id
    LEFT JOIN app_notification_event_rule_recipients recipient ON recipient.rule_id = rule.id
    WHERE event.event_key = ${eventKey}
    GROUP BY catalog.id, event.id, rule.id
  `);
  return result.rows[0];
}

export async function updateNotificationEventRuleRecord(input: {
  actorId: string;
  correlationId: string;
  eventKey: string;
  update: NotificationEventRuleUpdate;
}) {
  return getDatabase().transaction(async (transaction) => {
    const rule = await transaction.execute<{ id: string }>(sql`
      UPDATE app_notification_event_rules rule
      SET is_enabled = ${input.update.isEnabled}, updated_at = now()
      FROM app_notification_events event
      WHERE rule.event_id = event.id
        AND event.event_key = ${input.eventKey}
        AND rule.updated_at = ${input.update.expectedUpdatedAt}
      RETURNING rule.id
    `);
    const ruleId = rule.rows[0]?.id;
    if (!ruleId) return undefined;

    await transaction.execute(sql`
      UPDATE app_notification_events
      SET is_enabled = ${input.update.eventEnabled}, updated_at = now()
      WHERE event_key = ${input.eventKey}
    `);

    await transaction.execute(sql`
      DELETE FROM app_notification_event_rule_recipients
      WHERE rule_id = ${ruleId}::uuid
    `);
    await transaction.execute(sql`
      WITH recipient_input AS (
        SELECT *
        FROM jsonb_to_recordset(${JSON.stringify(input.update.recipients)}::jsonb)
          AS item("recipientType" text, "isRequired" boolean, "channelCodes" jsonb)
      ), inserted_recipients AS (
        INSERT INTO app_notification_event_rule_recipients (
          rule_id,
          recipient_type,
          is_required
        )
        SELECT ${ruleId}::uuid, input."recipientType", input."isRequired"
        FROM recipient_input input
        RETURNING id, recipient_type
      )
      INSERT INTO app_notification_event_rule_channels (
        rule_recipient_id,
        channel_id
      )
      SELECT recipient.id, channel.id
      FROM inserted_recipients recipient
      JOIN recipient_input input
        ON input."recipientType" = recipient.recipient_type
      CROSS JOIN LATERAL jsonb_array_elements_text(
        input."channelCodes"
      ) channel_code
      JOIN app_notification_channels channel
        ON channel.code = channel_code.value
    `);
    await transaction.insert(authorizationAuditEntries).values({
      action: "NOTIFICATION_EVENT_RULE_UPDATED",
      actorId: input.actorId,
      changes: {
        correlationId: input.correlationId,
        eventKey: input.eventKey,
      } satisfies NotificationAuditMetadata,
    });
    return { eventKey: input.eventKey };
  });
}

function deliveryWhere(query: NotificationDeliveryQuery) {
  return sql`WHERE (${query.eventKey ?? null}::text IS NULL OR occurrence.event_key = ${query.eventKey ?? null})
    AND (${query.status ?? null}::text IS NULL OR delivery.status = ${query.status ?? null})
    AND (${query.applicationReference ?? null}::text IS NULL OR occurrence.context->>'applicationReference' ILIKE ${query.applicationReference ? `%${query.applicationReference}%` : null})
    AND (${query.recipient ?? null}::text IS NULL OR delivery.recipient_email ILIKE ${query.recipient ? `%${query.recipient}%` : null} OR delivery.recipient_name ILIKE ${query.recipient ? `%${query.recipient}%` : null})
    AND (${query.dateFrom ? new Date(query.dateFrom) : null}::timestamptz IS NULL OR delivery.created_at >= ${query.dateFrom ? new Date(query.dateFrom) : null})
    AND (${query.dateTo ? new Date(query.dateTo) : null}::timestamptz IS NULL OR delivery.created_at <= ${query.dateTo ? new Date(query.dateTo) : null})`;
}

export async function listNotificationDeliveryRecords(query: NotificationDeliveryQuery) {
  const where = deliveryWhere(query);
  const orderColumn = query.sortField === "status"
    ? sql`delivery.status`
    : query.sortField === "nextAttemptAt"
      ? sql`delivery.next_attempt_at`
      : sql`delivery.created_at`;
  const direction = query.sortDirection === "asc" ? sql`ASC` : sql`DESC`;
  const offset = (query.page - 1) * query.pageSize;
  const [items, countResult] = await Promise.all([
    getDatabase().execute(sql`
      SELECT delivery.id AS "deliveryId",
        occurrence.event_key AS "eventKey",
        occurrence.context->>'applicationReference' AS "applicationReference",
        channel.code AS "channelCode",
        delivery.status,
        delivery.attempt_count AS "attemptCount",
        delivery.recipient_name AS "recipientName",
        delivery.recipient_email AS "recipientEmail",
        version.version_number AS "templateVersionNumber",
        delivery.last_error_code AS "failureCode",
        delivery.next_attempt_at AS "nextAttemptAt",
        delivery.sent_at AS "sentAt",
        delivery.created_at AS "createdAt",
        delivery.updated_at AS "updatedAt"
      FROM app_notification_deliveries delivery
      JOIN app_notification_outbox occurrence ON occurrence.id = delivery.outbox_id
      JOIN app_notification_channels channel ON channel.id = delivery.channel_id
      LEFT JOIN app_notification_template_versions version ON version.id = delivery.template_version_id
      ${where}
      ORDER BY ${orderColumn} ${direction}, delivery.id ${direction}
      LIMIT ${query.pageSize} OFFSET ${offset}
    `),
    getDatabase().execute<{ total: number }>(sql`
      SELECT count(*)::integer AS total
      FROM app_notification_deliveries delivery
      JOIN app_notification_outbox occurrence ON occurrence.id = delivery.outbox_id
      ${where}
    `),
  ]);
  return { items: items.rows, total: countResult.rows[0]?.total ?? 0 };
}

export async function retryNotificationDeliveryRecord(input: {
  actorId: string;
  correlationId: string;
  deliveryId: string;
  reason: string;
}) {
  return getDatabase().transaction(async (transaction) => {
    const current = await transaction.execute<{ outboxId: string; status: string }>(sql`
      SELECT outbox_id AS "outboxId", status
      FROM app_notification_deliveries
      WHERE id = ${input.deliveryId}::uuid
      FOR UPDATE
    `);
    const delivery = current.rows[0];
    if (!delivery) return { outcome: "NOT_FOUND" as const };
    if (delivery.status === "PENDING") return { outcome: "ALREADY_SCHEDULED" as const };
    if (delivery.status !== "FAILED") return { outcome: "INELIGIBLE" as const };
    await transaction.execute(sql`
      UPDATE app_notification_deliveries
      SET status = 'PENDING', next_attempt_at = now(), updated_at = now()
      WHERE id = ${input.deliveryId}::uuid
    `);
    await transaction.execute(sql`
      UPDATE app_notification_outbox
      SET status = 'PENDING', available_at = now(), processed_at = NULL,
        last_error_code = NULL, last_error_message = NULL, updated_at = now()
      WHERE id = ${delivery.outboxId}::uuid
    `);
    await transaction.insert(authorizationAuditEntries).values({
      action: "NOTIFICATION_DELIVERY_RETRY_REQUESTED",
      actorId: input.actorId,
      changes: {
        correlationId: input.correlationId,
        deliveryId: input.deliveryId,
        reason: input.reason,
      } satisfies NotificationAuditMetadata,
    });
    return { outcome: "SCHEDULED" as const };
  });
}

export async function getNotificationOperationalSummaryRecord(staleBefore: Date) {
  const result = await getDatabase().execute(sql`
    SELECT count(*) FILTER (WHERE delivery.status = 'PENDING' AND delivery.attempt_count = 0)::integer AS pending,
      count(*) FILTER (WHERE delivery.status = 'PENDING' AND delivery.attempt_count > 0)::integer AS retrying,
      count(*) FILTER (WHERE delivery.status = 'PROCESSING')::integer AS processing,
      count(*) FILTER (WHERE delivery.status = 'SENT')::integer AS sent,
      count(*) FILTER (WHERE delivery.status = 'FAILED')::integer AS failed,
      min(delivery.next_attempt_at) FILTER (WHERE delivery.status = 'PENDING') AS "oldestPendingAt",
      EXISTS (
        SELECT 1 FROM app_notification_outbox occurrence
        WHERE occurrence.status = 'PROCESSING' AND occurrence.locked_at <= ${staleBefore}
      ) AS "staleLock"
    FROM app_notification_deliveries delivery
  `);
  return result.rows[0];
}
