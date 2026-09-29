import "server-only";

import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import type {
  AuthenticationEventKey,
  NotificationEventContextByKey,
} from "../domain/NotificationEvent";

export async function insertAuthenticationNotification(
  eventKey: AuthenticationEventKey,
  context: NotificationEventContextByKey[AuthenticationEventKey],
  recipientName: string,
) {
  const occurrenceId = randomUUID();
  return getDatabase().transaction(async (transaction) => {
    const result = await transaction.execute<{ id: string }>(sql`
      WITH occurrence AS (
        INSERT INTO app_notification_outbox (
          id, event_id, event_key, aggregate_type, aggregate_id,
          occurrence_key, correlation_id, context
        )
        SELECT ${occurrenceId}::uuid, event.id, event.event_key, 'AUTHENTICATION',
          ${occurrenceId}::uuid, ${occurrenceId}, ${occurrenceId},
          ${JSON.stringify(context)}::jsonb
        FROM app_notification_events event
        WHERE event.event_key = ${eventKey} AND event.rule_eligibility = 'SYSTEM_ONLY'
          AND EXISTS (SELECT 1 FROM app_notification_channels WHERE code = 'EMAIL')
        RETURNING id
      )
      INSERT INTO app_notification_deliveries (
        outbox_id, channel_id, recipient_name, recipient_email,
        recipient_type, resolution_path
      )
      SELECT occurrence.id, channel.id, ${recipientName}, ${context.recipientEmail},
        'ACCOUNT_HOLDER', 'authenticated-account'
      FROM occurrence
      JOIN app_notification_channels channel ON channel.code = 'EMAIL'
      RETURNING id
    `);
    if (!result.rows[0])
      throw new Error("Authentication email delivery is not configured.");
  });
}
