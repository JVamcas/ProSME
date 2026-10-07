import "server-only";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDatabase } from "@/platform/database/client";
import type { WebsiteSourceBatch } from "../domain/WebsiteAnalyticsSnapshots";
import { websiteAnalyticsContractVersion } from "../domain/WebsiteAnalyticsSnapshots";
import type { GoogleAnalyticsConfiguration } from "./GoogleAnalyticsConfiguration";
import type { WebsiteAnalyticsQueryIdentity } from "./WebsiteAnalyticsQueryIdentity";
import { websiteAnalyticsRegistrationSql } from "./WebsiteAnalyticsRegistrationSql";

export type WebsiteAnalyticsSyncJob = WebsiteAnalyticsQueryIdentity & {
  leaseToken: string;
};

export async function registerWebsiteAnalyticsQueries(
  identities: WebsiteAnalyticsQueryIdentity[],
) {
  await getDatabase().execute(websiteAnalyticsRegistrationSql(identities));
}

export async function claimWebsiteAnalyticsSync(
  configuration: GoogleAnalyticsConfiguration,
) {
  const leaseToken = randomUUID();
  const result = await getDatabase().execute<WebsiteAnalyticsSyncJob>(sql`
    WITH due AS (
      SELECT query_key FROM app_reporting_website_queries
      WHERE next_due_at <= CURRENT_TIMESTAMP
        AND last_requested_at > CURRENT_TIMESTAMP - interval '7 days'
        AND (lease_expires_at IS NULL OR lease_expires_at <= CURRENT_TIMESTAMP)
        AND property_id = ${configuration.propertyId}
        AND timezone = ${configuration.timezone}
        AND collection_start = ${configuration.collectionStart}::date
        AND contract_version = ${websiteAnalyticsContractVersion}
      ORDER BY next_due_at, include_panels DESC, start_date DESC
      LIMIT 1 FOR UPDATE SKIP LOCKED
    )
    UPDATE app_reporting_website_queries query SET
      lease_token = ${leaseToken}::uuid,
      lease_expires_at = CURRENT_TIMESTAMP + interval '2 minutes'
    FROM due WHERE query.query_key = due.query_key
    RETURNING query.query_key AS "queryKey", query.property_id AS "propertyId",
      query.timezone, query.collection_start::text AS "collectionStart",
      query.contract_version AS "contractVersion", query.start_date::text AS "startDate",
      query.end_date::text AS "endDate", query.funding_call_id AS "fundingCallId",
      query.include_panels AS "includePanels", query.lease_token AS "leaseToken"
  `);
  return result.rows[0] ?? null;
}

export async function saveWebsiteAnalyticsSync(
  job: WebsiteAnalyticsSyncJob,
  sources: WebsiteSourceBatch,
) {
  const successful = Object.entries(sources)
    .filter(
      ([, source]) =>
        source.data !== null &&
        source.fetchedAt !== null &&
        ["ready", "no-data", "unavailable"].includes(source.state),
    )
    .map(([sourceName, source]) => ({ sourceName, ...source }));
  const failures = Object.fromEntries(
    Object.entries(sources)
      .filter(
        ([, source]) =>
          source.data === null ||
          source.fetchedAt === null ||
          !["ready", "no-data", "unavailable"].includes(source.state),
      )
      .map(([name]) => [name, true]),
  );

  return getDatabase().transaction(async (transaction) => {
    const owned = await transaction.execute(sql`
      SELECT query_key FROM app_reporting_website_queries
      WHERE query_key = ${job.queryKey} AND lease_token = ${job.leaseToken}::uuid
      FOR UPDATE
    `);
    if (!owned.rows.length) return false;
    // Successful sources are replaced atomically; failed sources retain their last report.
    if (successful.length) {
      await transaction.execute(sql`
        INSERT INTO app_reporting_website_source_snapshots
          (query_key, source_name, state, data, metadata, note, fetched_at)
        SELECT ${job.queryKey}, "sourceName", state, data, metadata, note, "fetchedAt"
        FROM jsonb_to_recordset(${JSON.stringify(successful)}::jsonb) AS sources(
          "sourceName" text, state text, data jsonb, metadata jsonb, note text, "fetchedAt" timestamptz)
        ON CONFLICT (query_key, source_name) DO UPDATE SET
          state = EXCLUDED.state, data = EXCLUDED.data, metadata = EXCLUDED.metadata,
          note = EXCLUDED.note, fetched_at = EXCLUDED.fetched_at
      `);
    }
    await transaction.execute(sql`
      UPDATE app_reporting_website_queries SET
        failures = ${JSON.stringify(failures)}::jsonb,
        last_attempt_at = CURRENT_TIMESTAMP,
        next_due_at = CASE WHEN include_panels AND NOT ${job.includePanels}
          THEN CURRENT_TIMESTAMP ELSE CURRENT_TIMESTAMP + interval '5 minutes' END,
        lease_token = NULL, lease_expires_at = NULL
      WHERE query_key = ${job.queryKey}
    `);
    return true;
  });
}
