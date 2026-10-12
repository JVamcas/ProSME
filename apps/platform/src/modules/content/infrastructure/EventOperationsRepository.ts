import "server-only";

import { sql } from "drizzle-orm";
import { getDatabase } from "@/platform/database/client";
import type { EventParticipantQuery } from "../api/EventRegistrationSchemas";
import type {
  EventDeliveryRow,
  EventParticipantStatus,
} from "../api/EventOperationsTypes";

const intentStates = (eventId: number) => sql`
  SELECT i.registration_id, i.kind, i.due_at, d.sent_at,
    COALESCE(d.attempt_count, 0) AS attempts, d.last_error_code,
    CASE WHEN i.state = 'CANCELLED' THEN 'Cancelled'
      WHEN d.status = 'SENT' THEN 'Sent'
      WHEN d.status IN ('FAILED', 'DEAD_LETTER') THEN 'Failed'
      WHEN d.last_error_code IS NOT NULL THEN 'Retrying'
      WHEN d.status = 'PROCESSING' THEN 'Sending'
      WHEN i.kind = 'REMINDER' THEN 'Scheduled' ELSE 'Pending' END AS state
  FROM app_event_notification_intents i
  LEFT JOIN app_notification_deliveries d ON d.outbox_id = i.outbox_id
  WHERE i.event_id = ${eventId}
`;

const emptyIntentStates = sql`SELECT NULL::uuid AS registration_id,
  NULL::text AS kind, NULL::text AS state WHERE false`;

export async function readEventOperationsCounts(
  eventId: number,
  access: { participants: boolean; delivery: boolean },
) {
  const result = await getDatabase().execute<{
    registered: number;
    confirmationsSent: number;
    remindersScheduled: number;
    deliveryIssues: number;
  }>(sql`
    WITH states AS (${access.delivery ? intentStates(eventId) : emptyIntentStates})
    SELECT ${access.participants ? sql`(SELECT count(*)::integer FROM app_event_registrations WHERE event_id = ${eventId})` : sql`NULL::integer`} AS registered,
      count(*) FILTER (WHERE s.kind = 'CONFIRMATION' AND s.state = 'Sent')::integer AS "confirmationsSent",
      count(*) FILTER (WHERE s.kind = 'REMINDER' AND s.state IN ('Scheduled', 'Retrying', 'Sending'))::integer AS "remindersScheduled",
      count(*) FILTER (WHERE s.state IN ('Failed', 'Retrying'))::integer AS "deliveryIssues"
    FROM states s
  `);
  return result.rows[0];
}

export async function readEventParticipantStatuses(
  eventId: number,
  query: EventParticipantQuery,
  delivery: boolean,
) {
  const term = `%${query.search.replace(/[\\%_]/g, "\\$&")}%`;
  const filter = sql`r.event_id = ${eventId} AND (r.full_name ILIKE ${term} OR r.organisation ILIKE ${term} OR r.email ILIKE ${term})`;
  const [rows, count] = await Promise.all([
    getDatabase().execute<EventParticipantStatus>(sql`
      WITH states AS (${delivery ? intentStates(eventId) : emptyIntentStates})
      SELECT r.id, r.full_name AS "fullName", r.email, r.organisation, r.registered_at AS "registeredAt",
        ${delivery ? sql`COALESCE(c.state, 'Disabled')` : sql`'Restricted'`} AS confirmation,
        ${delivery ? sql`COALESCE(m.state, 'Disabled')` : sql`'Restricted'`} AS reminder
      FROM app_event_registrations r
      LEFT JOIN states c ON c.registration_id = r.id AND c.kind = 'CONFIRMATION'
      LEFT JOIN states m ON m.registration_id = r.id AND m.kind = 'REMINDER'
      WHERE ${filter} ORDER BY r.registered_at DESC, r.id DESC
      LIMIT ${query.pageSize} OFFSET ${(query.page - 1) * query.pageSize}
    `),
    getDatabase().execute<{ total: number }>(
      sql`SELECT count(*)::integer AS total FROM app_event_registrations r WHERE ${filter}`,
    ),
  ]);
  return {
    items: rows.rows,
    total: count.rows[0].total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export async function readEventDeliveryPage(
  eventId: number,
  query: EventParticipantQuery,
) {
  const [rows, count] = await Promise.all([
    getDatabase().execute<EventDeliveryRow>(sql`
      WITH states AS (${intentStates(eventId)})
      SELECT i.id, r.full_name AS participant, i.kind, s.state,
        i.due_at AS "dueAt", s.sent_at AS "sentAt", s.attempts, s.last_error_code AS "errorCode"
      FROM states s JOIN app_event_notification_intents i ON i.registration_id = s.registration_id AND i.kind = s.kind
      JOIN app_event_registrations r ON r.id = i.registration_id
      WHERE i.event_id = ${eventId} ORDER BY i.due_at DESC, i.id DESC
      LIMIT ${query.pageSize} OFFSET ${(query.page - 1) * query.pageSize}
    `),
    getDatabase().execute<{ total: number }>(
      sql`SELECT count(*)::integer AS total FROM app_event_notification_intents WHERE event_id = ${eventId}`,
    ),
  ]);
  return {
    items: rows.rows,
    total: count.rows[0].total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export async function readOperationsEventPage(page: number) {
  const [rows, count] = await Promise.all([
    getDatabase().execute<{
      id: number;
      title: string;
      startsAt: string;
      timezone: string;
      location: string;
    }>(sql`
      SELECT id, title, starts_at AS "startsAt", timezone, location FROM cms_events
      ORDER BY starts_at DESC, id DESC LIMIT 20 OFFSET ${(page - 1) * 20}
    `),
    getDatabase().execute<{ total: number }>(
      sql`SELECT count(*)::integer AS total FROM cms_events`,
    ),
  ]);
  return { items: rows.rows, total: count.rows[0].total, page, pageSize: 20 };
}
