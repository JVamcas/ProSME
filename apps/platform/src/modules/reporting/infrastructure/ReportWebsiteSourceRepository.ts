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

export async function recordReportSourceCoverage(
  runId: string,
  leaseToken: string | null,
  queryKey: string,
) {
  const result = await getDatabase().execute(sql`
    UPDATE app_reporting_report_runs run SET source_coverage = (
      SELECT jsonb_build_object('queryKey', query.query_key, 'propertyId', query.property_id,
        'contractVersion', query.contract_version, 'collectionStart', query.collection_start,
        'startDate', query.start_date, 'endDate', query.end_date, 'timezone', query.timezone,
        'sources', (SELECT jsonb_object_agg(source_name, jsonb_build_object('state', state, 'fetchedAt', fetched_at, 'note', note))
          FROM app_reporting_website_source_snapshots WHERE query_key = query.query_key))
      FROM app_reporting_website_queries query WHERE query.query_key = ${queryKey}
    ) WHERE run.id = ${runId}::uuid AND run.lease_token = ${leaseToken}::uuid
      AND run.lease_until > now() AND run.status IN ('QUEUED', 'PREPARING_SOURCE', 'RUNNING') RETURNING id
  `);
  return result.rows.length > 0;
}
