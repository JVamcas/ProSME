import "server-only";

import { sql } from "drizzle-orm";
import {
  getDatabase,
  type DatabaseTransaction,
} from "@/platform/database/client";

// Refresh only undelivered intents. Outbox contexts are immutable: a changed
// published date cancels the old delivery and creates a new occurrence later.
export async function reconcileEventEmailIntents(
  transaction: DatabaseTransaction,
  eventId?: number,
) {
  await transaction.execute(
    sql`SELECT app_reconcile_event_email_intents(${eventId ?? null}::integer)`,
  );
}

export async function prepareEventEmailDeliveries(batchSize: number) {
  return getDatabase().transaction(async (transaction) => {
    await reconcileEventEmailIntents(transaction);
    await transaction.execute(sql`
      WITH due AS (
        SELECT i.*, r.full_name, r.email FROM app_event_notification_intents i
        JOIN app_event_registrations r ON r.id = i.registration_id
        WHERE i.state = 'PENDING' AND i.due_at <= now() AND r.email_consent
        ORDER BY i.due_at, i.id LIMIT ${batchSize}
        FOR UPDATE OF i SKIP LOCKED
      ), occurrences AS (
        INSERT INTO app_notification_outbox (
          event_id, event_key, aggregate_type, aggregate_id,
          occurrence_key, correlation_id, context
        ) SELECT e.id, e.event_key, 'EVENT_REGISTRATION', due.registration_id,
          due.id::text || ':' || due.revision::text,
          due.id::text, (due.published_snapshot - 'id') || jsonb_build_object(
            'eventId', due.event_id, 'registrationId', due.registration_id)
        FROM due JOIN app_notification_events e ON e.event_key =
          CASE WHEN due.kind = 'REMINDER' THEN 'event.registration.reminder'
            ELSE 'event.registration.confirmed' END
        WHERE EXISTS (SELECT 1 FROM app_notification_channels WHERE code = 'EMAIL')
        ON CONFLICT (event_key, occurrence_key) DO UPDATE SET updated_at = now()
        RETURNING id, correlation_id
      ), deliveries AS (
        INSERT INTO app_notification_deliveries (
          outbox_id, channel_id, recipient_name, recipient_email,
          recipient_type, resolution_path
        ) SELECT o.id, c.id, due.full_name, due.email, 'EVENT_PARTICIPANT',
          'event-registration-consent'
        FROM occurrences o JOIN due ON due.id::text = o.correlation_id
        JOIN app_notification_channels c ON c.code = 'EMAIL'
        ON CONFLICT DO NOTHING RETURNING outbox_id
      ) UPDATE app_event_notification_intents i SET state = 'CAPTURED', outbox_id = o.id
        FROM occurrences o WHERE i.id::text = o.correlation_id
    `);
  });
}

// Hold a shared CMS/settings lock through the send. Publication/withdrawal and
// settings writes must wait; a queued retry can never send an obsolete snapshot.
export async function withCurrentEventDelivery<T>(
  outboxId: string,
  operation: () => Promise<T>,
): Promise<T | null> {
  return getDatabase().transaction(async (transaction) => {
    const result = await transaction.execute<{ valid: boolean }>(sql`
      SELECT e._status = 'published' AND r.email_consent AND
        (CASE WHEN i.kind = 'REMINDER' THEN s.reminder_enabled
          AND e.starts_at > now()
          AND i.due_at = e.starts_at - s.reminder_hours * interval '1 hour'
          ELSE s.confirmation_enabled END)
        AND i.published_snapshot = jsonb_build_object(
          'id', e.id, 'title', e.title, 'slug', e.slug, 'startsAt', e.starts_at,
          'endsAt', e.ends_at, 'timezone', e.timezone, 'location', e.location
        ) AS valid
      FROM app_event_notification_intents i
      JOIN cms_events e ON e.id = i.event_id
      JOIN app_event_registration_settings s ON s.event_id = e.id
      JOIN app_event_registrations r ON r.id = i.registration_id
      WHERE i.outbox_id = ${outboxId}::uuid AND i.state = 'CAPTURED'
      FOR SHARE OF e, s, r
    `);
    if (result.rows[0]?.valid) return operation();
    await transaction.execute(sql`
      UPDATE app_notification_deliveries SET status = 'FAILED',
        last_error_code = 'EVENT_RECONCILED', updated_at = now()
      WHERE outbox_id = ${outboxId}::uuid AND status <> 'SENT'
    `);
    return null;
  });
}
