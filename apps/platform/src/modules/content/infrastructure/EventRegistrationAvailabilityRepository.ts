import "server-only";

import { sql } from "drizzle-orm";
import { getDatabase } from "@/platform/database/client";

type RegistrationAvailabilityRow = {
  id: number;
  startsAt: string;
  published: boolean;
  enabled: boolean | null;
  opensAt: string | null;
  closesAt: string | null;
};

export async function readEventRegistrationAvailability(eventIds: readonly number[]) {
  if (eventIds.length === 0) return [];

  const result = await getDatabase().execute<RegistrationAvailabilityRow>(sql`
    SELECT e.id, e.starts_at AS "startsAt", (e._status = 'published') AS published,
      s.enabled, s.opens_at AS "opensAt", s.closes_at AS "closesAt"
    FROM cms_events e
    LEFT JOIN app_event_registration_settings s ON s.event_id = e.id
    WHERE e.id IN (${sql.join(eventIds.map((id) => sql`${id}`), sql`, `)})
  `);
  return result.rows;
}
