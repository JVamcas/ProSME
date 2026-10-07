import "server-only";
import { sql } from "drizzle-orm";
import { getDatabase } from "@/platform/database/client";
import type { WebsiteAnalyticsQuery } from "../api/WebsiteAnalyticsSchemas";
import type { WebsiteAnalyticsMetrics } from "../domain/WebsiteAnalyticsMetrics";
import type {
  WebsiteAnalyticsSynchronization,
  WebsiteMetricChanges,
  WebsiteSourceSnapshots,
} from "../domain/WebsiteAnalyticsSnapshots";
import type { GoogleAnalyticsConfiguration } from "./GoogleAnalyticsConfiguration";
import { anonymousEligibilityAggregationSql } from "./AnonymousEligibilityRepository";
import { websiteAnalyticsQueryIdentities } from "./WebsiteAnalyticsQueryIdentity";
import { websiteAnalyticsRegistrationSql } from "./WebsiteAnalyticsRegistrationSql";
import {
  websiteAnalyticsChangesSql,
  websiteAnalyticsStoredSourcesSql,
} from "./WebsiteAnalyticsProjectionSql";

type ProjectionRow = {
  queryKey: string;
  sources: WebsiteSourceSnapshots;
  synchronization: WebsiteAnalyticsSynchronization;
  changes: WebsiteMetricChanges;
  eligibility: NonNullable<WebsiteAnalyticsMetrics["eligibility"]["data"]>;
};

export async function readStoredWebsiteAnalytics(
  period: WebsiteAnalyticsQuery,
  configuration: GoogleAnalyticsConfiguration,
) {
  const identities = websiteAnalyticsQueryIdentities(period, configuration);
  const result = await getDatabase().execute<ProjectionRow>(sql`
    WITH registered AS (${websiteAnalyticsRegistrationSql(identities)}),
    projected AS (${websiteAnalyticsStoredSourcesSql()}),
    eligibility AS (${anonymousEligibilityAggregationSql({ ...period, timezone: configuration.timezone })}),
    comparison AS (${websiteAnalyticsChangesSql(identities[0].queryKey, identities[1]?.queryKey)})
    SELECT query_key AS "queryKey", sources, synchronization, comparison.changes,
      (SELECT coalesce(jsonb_agg(eligibility ORDER BY outcome), '[]'::jsonb) FROM eligibility) AS eligibility
    FROM projected CROSS JOIN comparison
    ORDER BY start_date DESC
  `);
  const current = result.rows.find(
    (row) => row.queryKey === identities[0].queryKey,
  )!;
  const previous = identities[1]
    ? (result.rows.find((row) => row.queryKey === identities[1].queryKey) ??
      null)
    : null;
  return { current, previous };
}
