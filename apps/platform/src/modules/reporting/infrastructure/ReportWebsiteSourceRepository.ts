import "server-only";
import { sql } from "drizzle-orm";
import { getDatabase } from "@/platform/database/client";

export async function reportWebsiteSourceReady(queryKey: string) {
  const result = await getDatabase().execute<{ ready: boolean }>(sql`
    SELECT query.failures = '{}'::jsonb AND query.last_attempt_at >= now() - interval '10 minutes'
      AND (SELECT count(*) = 10 FROM app_reporting_website_source_snapshots source
        WHERE source.query_key = query.query_key AND source.state IN ('ready', 'no-data', 'unavailable')) AS ready
    FROM app_reporting_website_queries query WHERE query_key = ${queryKey}
  `);
  return result.rows[0]?.ready === true;
}
