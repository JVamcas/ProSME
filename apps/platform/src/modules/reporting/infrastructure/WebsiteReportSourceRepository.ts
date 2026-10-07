import "server-only";
import { sql } from "drizzle-orm";
import { getDatabase } from "@/platform/database/client";
import {
  websiteMetricSources,
  websitePanelSources,
  type WebsiteSourceSnapshots,
} from "../domain/WebsiteAnalyticsSnapshots";
import type { WebsiteAnalyticsMetrics } from "../domain/WebsiteAnalyticsMetrics";
import { anonymousEligibilityAggregationSql } from "./AnonymousEligibilityRepository";
import { websiteAnalyticsQueryIdentity } from "./WebsiteAnalyticsQueryIdentity";
import { websiteAnalyticsRegistrationSql } from "./WebsiteAnalyticsRegistrationSql";
import type { ClaimedWebsiteReport } from "./WebsiteReportClaimRepository";

export async function readCompletedWebsiteReportSources(
  job: ClaimedWebsiteReport,
) {
  const period = { startDate: job.startDate, endDate: job.endDate };
  const configuration = job.configuration.analytics;
  const identity = websiteAnalyticsQueryIdentity(period, configuration, true);
  const requiredSources = [...websiteMetricSources, ...websitePanelSources];
  const result = await getDatabase().execute<{
    sources: WebsiteSourceSnapshots | null;
    eligibility: NonNullable<WebsiteAnalyticsMetrics["eligibility"]["data"]>;
  }>(sql`
    WITH registered AS (${websiteAnalyticsRegistrationSql([identity])}),
    eligible_sources AS (
      SELECT snapshot.source_name, snapshot.state, snapshot.data, snapshot.metadata,
        snapshot.note, snapshot.fetched_at
      FROM app_reporting_website_source_snapshots snapshot
      JOIN registered query ON query.query_key = snapshot.query_key
      WHERE snapshot.source_name IN (SELECT jsonb_array_elements_text(${JSON.stringify(requiredSources)}::jsonb))
        AND snapshot.data IS NOT NULL AND snapshot.fetched_at >= ${job.dueAt}::timestamptz
        AND snapshot.state IN ('ready', 'no-data', 'unavailable')
        AND NOT (query.failures ? snapshot.source_name)
    ), eligibility AS (${anonymousEligibilityAggregationSql({ ...period, timezone: configuration.timezone })})
    SELECT CASE WHEN count(*) = ${requiredSources.length} THEN jsonb_object_agg(source_name,
      jsonb_build_object('state', state, 'data', data, 'metadata', metadata, 'note', note, 'fetchedAt', fetched_at))
      ELSE NULL END AS sources,
      (SELECT coalesce(jsonb_agg(eligibility ORDER BY outcome), '[]'::jsonb) FROM eligibility) AS eligibility
    FROM eligible_sources
  `);
  const row = result.rows[0]!;
  return row.sources ? row : null;
}
