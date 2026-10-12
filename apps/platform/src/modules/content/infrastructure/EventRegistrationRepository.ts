import "server-only";

import { sql } from "drizzle-orm";
import {
  getDatabase,
  type DatabaseTransaction,
} from "@/platform/database/client";
import type {
  EventParticipant,
  EventRegistrationSettings,
  PublishedRegistrationEvent,
} from "../domain/EventRegistration";
import type {
  EventParticipantQuery,
  EventRegistrationInput,
  EventSettingsInput,
} from "../api/EventRegistrationSchemas";

export function eventRegistrationTransaction<T>(
  operation: (transaction: DatabaseTransaction) => Promise<T>,
) {
  return getDatabase().transaction(operation);
}

// Payload keeps a published document in the main table and draft revisions in
// its version table. Lock the main row so withdrawal/publication cannot race a
// registration; settings changes use the same lock order.
export async function readRegistrationEvent(
  transaction: DatabaseTransaction,
  eventId: number,
  publishedOnly = true,
) {
  const result = await transaction.execute<PublishedRegistrationEvent>(sql`
    SELECT id, title, slug, starts_at AS "startsAt", ends_at AS "endsAt",
      timezone, location, (_status = 'published') AS published
    FROM cms_events
    WHERE id = ${eventId}
      ${publishedOnly ? sql`AND _status = 'published'` : sql``}
    FOR SHARE
  `);
  return result.rows[0] ?? null;
}

export async function readRegistrationSettings(
  transaction: DatabaseTransaction,
  eventId: number,
) {
  const result = await transaction.execute<EventRegistrationSettings>(sql`
    SELECT event_id AS "eventId", enabled, opens_at AS "opensAt",
      closes_at AS "closesAt", confirmation_enabled AS "confirmationEnabled",
      reminder_enabled AS "reminderEnabled", reminder_hours AS "reminderHours"
    FROM app_event_registration_settings WHERE event_id = ${eventId}
    FOR UPDATE
  `);
  return result.rows[0] ?? null;
}

export async function saveRegistrationSettings(
  transaction: DatabaseTransaction,
  eventId: number,
  input: EventSettingsInput,
  actorId: string,
) {
  await transaction.execute(sql`
    INSERT INTO app_event_registration_settings (
      event_id, enabled, opens_at, closes_at, confirmation_enabled,
      reminder_enabled, reminder_hours, updated_by
    ) VALUES (
      ${eventId}, ${input.enabled}, ${input.opensAt}::timestamptz,
      ${input.closesAt}::timestamptz, ${input.confirmationEnabled},
      ${input.reminderEnabled}, ${input.reminderHours}, ${actorId}::uuid
    ) ON CONFLICT (event_id) DO UPDATE SET
      enabled = EXCLUDED.enabled, opens_at = EXCLUDED.opens_at,
      closes_at = EXCLUDED.closes_at,
      confirmation_enabled = EXCLUDED.confirmation_enabled,
      reminder_enabled = EXCLUDED.reminder_enabled,
      reminder_hours = EXCLUDED.reminder_hours,
      updated_by = EXCLUDED.updated_by, updated_at = now()
  `);
}

export async function insertEventParticipant(
  transaction: DatabaseTransaction,
  eventId: number,
  input: EventRegistrationInput,
) {
  const result = await transaction.execute<{ id: string }>(sql`
    INSERT INTO app_event_registrations (
      event_id, full_name, email, organisation, email_consent
    ) VALUES (
      ${eventId}, ${input.fullName}, ${input.email},
      ${input.organisation || null}, true
    ) ON CONFLICT (event_id, email) DO NOTHING
    RETURNING id
  `);
  return result.rows[0] ?? null;
}

export async function auditEventRegistration(
  transaction: DatabaseTransaction,
  eventId: number,
  registrationId: string | null,
  action: "REGISTERED" | "SETTINGS_UPDATED" | "PARTICIPANTS_READ",
  actorId: string | null,
  details: unknown = {},
) {
  await transaction.execute(sql`
    INSERT INTO app_event_registration_audit (
      event_id, registration_id, action, actor_id, details
    ) VALUES (
      ${eventId}, ${registrationId}::uuid, ${action}, ${actorId}::uuid,
      ${JSON.stringify(details)}::jsonb
    )
  `);
}

export async function listEventParticipants(
  transaction: DatabaseTransaction,
  eventId: number,
  query: EventParticipantQuery,
) {
  const term = `%${query.search.replace(/[\\%_]/g, "\\$&")}%`;
  const filter = sql`event_id = ${eventId} AND (
    full_name ILIKE ${term} OR email ILIKE ${term} OR organisation ILIKE ${term}
  )`;
  const [rows, count] = await Promise.all([
    transaction.execute<EventParticipant>(sql`
      SELECT id, full_name AS "fullName", email, organisation,
        registered_at AS "registeredAt"
      FROM app_event_registrations WHERE ${filter}
      ORDER BY registered_at DESC, id DESC
      LIMIT ${query.pageSize} OFFSET ${(query.page - 1) * query.pageSize}
    `),
    transaction.execute<{ total: number }>(sql`
      SELECT count(*)::integer AS total FROM app_event_registrations
      WHERE ${filter}
    `),
  ]);
  return { items: rows.rows, total: count.rows[0].total, ...query };
}
