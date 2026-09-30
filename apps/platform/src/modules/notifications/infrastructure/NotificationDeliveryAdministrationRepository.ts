import "server-only";

import { sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { authorizationAuditEntries } from "@/db/schema";
import type { NotificationDeliveryQuery } from "../api/NotificationAdministrationSchemas";
import type { NotificationAuditMetadata } from "../domain/NotificationAudit";

function deliveryWhere(query: NotificationDeliveryQuery) {
  return sql`WHERE (${query.eventKey ?? null}::text IS NULL OR occurrence.event_key = ${query.eventKey ?? null})
    AND (${query.status ?? null}::text IS NULL OR delivery.status = ${query.status ?? null})
    AND (${query.applicationReference ?? null}::text IS NULL OR occurrence.context->>'applicationReference' ILIKE ${query.applicationReference ? `%${query.applicationReference}%` : null})
    AND (${query.recipient ?? null}::text IS NULL OR delivery.recipient_email ILIKE ${query.recipient ? `%${query.recipient}%` : null} OR delivery.recipient_name ILIKE ${query.recipient ? `%${query.recipient}%` : null})
    AND (${query.dateFrom ? new Date(query.dateFrom) : null}::timestamptz IS NULL OR delivery.created_at >= ${query.dateFrom ? new Date(query.dateFrom) : null})
    AND (${query.dateTo ? new Date(query.dateTo) : null}::timestamptz IS NULL OR delivery.created_at <= ${query.dateTo ? new Date(query.dateTo) : null})`;
}

export async function listNotificationDeliveryRecords(
  query: NotificationDeliveryQuery,
) {
  const where = deliveryWhere(query);
  const orderColumn =
    query.sortField === "status"
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
    const current = await transaction.execute<{
      outboxId: string;
      status: string;
    }>(sql`
      SELECT outbox_id AS "outboxId", status
      FROM app_notification_deliveries
      WHERE id = ${input.deliveryId}::uuid
      FOR UPDATE
    `);
    const delivery = current.rows[0];
    if (!delivery) return { outcome: "NOT_FOUND" as const };
    if (delivery.status === "PENDING")
      return { outcome: "ALREADY_SCHEDULED" as const };
    if (!["FAILED", "DEAD_LETTER"].includes(delivery.status)) {
      return { outcome: "INELIGIBLE" as const };
    }
    await transaction.execute(sql`
      UPDATE app_notification_deliveries
      SET status = 'PENDING', attempt_count = 0, next_attempt_at = now(),
        last_error_code = NULL, last_error_message = NULL, updated_at = now()
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

export async function getNotificationOperationalSummaryRecord(
  staleBefore: Date,
) {
  const result = await getDatabase().execute(sql`
    SELECT count(*) FILTER (WHERE delivery.status = 'PENDING' AND delivery.attempt_count = 0)::integer AS pending,
      count(*) FILTER (WHERE delivery.status = 'PENDING' AND delivery.attempt_count > 0)::integer AS retrying,
      count(*) FILTER (WHERE delivery.status = 'PROCESSING')::integer AS processing,
      count(*) FILTER (WHERE delivery.status = 'SENT')::integer AS sent,
      count(*) FILTER (WHERE delivery.status = 'FAILED')::integer AS failed,
      count(*) FILTER (WHERE delivery.status = 'DEAD_LETTER')::integer AS "deadLetter",
      min(delivery.next_attempt_at) FILTER (WHERE delivery.status = 'PENDING') AS "oldestPendingAt",
      EXISTS (
        SELECT 1 FROM app_notification_outbox occurrence
        WHERE occurrence.status = 'PROCESSING' AND occurrence.locked_at <= ${staleBefore}
      ) AS "staleLock"
    FROM app_notification_deliveries delivery
  `);
  return result.rows[0];
}
