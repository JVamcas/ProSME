import "server-only";

import { sql } from "drizzle-orm";
import type { DatabaseTransaction } from "@/platform/database/client";
import type {
  EventRegistrationSettings,
  PublishedRegistrationEvent,
} from "@/modules/content/domain/EventRegistration";

// Phase 1 captures durable intent only. Phase 4 will reconcile published event
// changes and hand these records to the existing notification dispatcher.
// Do not feed unreconciled reminders directly into the delivery queue.
export async function captureEventRegistrationIntents(
  transaction: DatabaseTransaction,
  registrationId: string,
  event: PublishedRegistrationEvent,
  settings: EventRegistrationSettings,
) {
  await transaction.execute(sql`
    INSERT INTO app_event_notification_intents (
      registration_id, event_id, kind, due_at, published_snapshot
    )
    SELECT ${registrationId}::uuid, ${event.id}, intent.kind, intent.due_at,
      ${JSON.stringify(event)}::jsonb
    FROM (
      SELECT 'CONFIRMATION' AS kind, now() AS due_at
      WHERE ${settings.confirmationEnabled}
      UNION ALL
      SELECT 'REMINDER', ${event.startsAt}::timestamptz -
        ${settings.reminderHours} * interval '1 hour'
      WHERE ${settings.reminderEnabled}
    ) intent
    ON CONFLICT (registration_id, kind) DO NOTHING
  `);
}
