import "server-only";

import { sql } from "drizzle-orm";
import { getDatabase } from "@/platform/database/client";

export async function readRecordingCategories() {
  const result = await getDatabase().execute<{ category: string }>(sql`
    SELECT DISTINCT category FROM cms_events
    WHERE _status = 'published' AND starts_at <= now()
      AND (ends_at IS NULL OR ends_at <= now())
      AND recording_url IS NOT NULL AND recording_url <> ''
      AND category IS NOT NULL AND category <> ''
    ORDER BY category LIMIT 200
  `);
  return result.rows.map((row) => row.category);
}
