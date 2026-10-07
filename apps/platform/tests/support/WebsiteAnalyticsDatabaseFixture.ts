import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { vi } from "vitest";
import { getDatabase } from "@/platform/database/client";
import type { AnalyticsSourceResult } from "@/modules/reporting/domain/WebsiteAnalyticsMetrics";
import type { WebsiteAnalyticsQuery } from "@/modules/reporting/api/WebsiteAnalyticsSchemas";
import {
  websiteMetricSources,
  websitePanelSources,
} from "@/modules/reporting/domain/WebsiteAnalyticsSnapshots";
import { websiteAnalyticsQueryIdentity } from "@/modules/reporting/infrastructure/WebsiteAnalyticsQueryIdentity";
import type { WebsiteAnalyticsSyncJob } from "@/modules/reporting/infrastructure/WebsiteAnalyticsSyncRepository";

export const reportingDatabaseEnabled =
  process.env.RUN_REPORTING_DATABASE_TESTS === "true";
export const reportingConfiguration = {
  propertyId: "123",
  timezone: "Africa/Windhoek",
  collectionStart: "2026-01-01",
};
export const reportingPeriod = {
  startDate: "2026-10-01",
  endDate: "2026-10-06",
};

export function storedSource<T>(
  data: T,
  state: AnalyticsSourceResult<T>["state"] = "ready",
): AnalyticsSourceResult<T> {
  return {
    state,
    data,
    fetchedAt: new Date().toISOString(),
    metadata: null,
    note: null,
  };
}

export function metricBatch(visitors = 100) {
  return {
    traffic: storedSource({
      visitors,
      pageViews: visitors * 2,
      averageSessionDurationSeconds: 100,
    }),
    applicationReach: storedSource({ startedUsers: 10, submittedUsers: 5 }),
    starterCompletion: storedSource({
      startedUsers: 10,
      submittedUsers: 5,
      rate: 0.5,
    }),
  };
}

export function fullBatch(visitors = 100) {
  return {
    ...metricBatch(visitors),
    applicationFunnel: storedSource({
      viewedUsers: 20,
      completedSelfCheckUsers: 15,
      startedUsers: 10,
      submittedUsers: 5,
    }),
    dailyTraffic: storedSource([], "no-data"),
    mostViewedPages: storedSource({ rows: [], truncated: false }, "no-data"),
    geography: storedSource(
      {
        country: "Namibia",
        regions: [],
        regionalUserSum: 0,
        shareDenominator: "sum-of-regional-user-counts",
      },
      "no-data",
    ),
    fundingCallEngagement: storedSource(
      { rows: [], truncated: false },
      "no-data",
    ),
    selfCheckJourney: storedSource(
      { viewedUsers: 0, completedSelfCheckUsers: 0 },
      "no-data",
    ),
  };
}

export function createReportingDatabaseFixture() {
  let client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5_000,
  });
  const schema = `reporting_test_${randomUUID().replaceAll("-", "")}`;
  let prepared = false;
  return {
    get client() {
      return client;
    },
    async reconnect() {
      await client.end();
      client = new pg.Client({
        connectionString: process.env.DATABASE_URL,
        connectionTimeoutMillis: 5_000,
      });
      await client.connect();
      await client.query(`SET search_path TO "${schema}"`);
      vi.mocked(getDatabase).mockReturnValue(
        drizzle(client) as ReturnType<typeof getDatabase>,
      );
    },
    async prepare() {
      if (!reportingDatabaseEnabled) return;
      await client.connect();
      await client.query(`CREATE SCHEMA "${schema}"`);
      await client.query(`SET search_path TO "${schema}"`);
      prepared = true;
      await client.query(`CREATE TABLE app_reporting_anonymous_eligibility_checks (
        funding_call_id uuid, outcome text, occurred_at timestamptz
      )`);
      const migration = await readFile(
        new URL(
          "../../drizzle/0165_website_analytics_persistence.sql",
          import.meta.url,
        ),
        "utf8",
      );
      await client.query(migration);
      await client.query(migration);
      vi.mocked(getDatabase).mockReturnValue(
        drizzle(client) as ReturnType<typeof getDatabase>,
      );
    },
    async reset() {
      await client.query(
        "TRUNCATE app_reporting_website_source_snapshots, app_reporting_website_queries, app_reporting_anonymous_eligibility_checks",
      );
    },
    async finish() {
      if (!reportingDatabaseEnabled) return;
      if (prepared) await client.query(`DROP SCHEMA "${schema}" CASCADE`);
      await client.end();
    },
    async seed(
      period: WebsiteAnalyticsQuery = reportingPeriod,
      visitors = 100,
      panels = true,
    ): Promise<WebsiteAnalyticsSyncJob> {
      const identity = websiteAnalyticsQueryIdentity(
        period,
        reportingConfiguration,
        panels,
      );
      const token = randomUUID();
      await client.query(
        `INSERT INTO app_reporting_website_queries
        (query_key, property_id, timezone, collection_start, contract_version,
         start_date, end_date, funding_call_id, include_panels, lease_token, lease_expires_at)
        VALUES ($1, $2, $3, $4, 'd1-v2', $5, $6, $7, $8, $9, now() + interval '2 minutes')`,
        [
          identity.queryKey,
          identity.propertyId,
          identity.timezone,
          identity.collectionStart,
          identity.startDate,
          identity.endDate,
          identity.fundingCallId,
          panels,
          token,
        ],
      );
      const batch = panels ? fullBatch(visitors) : metricBatch(visitors);
      for (const name of [
        ...websiteMetricSources,
        ...(panels ? websitePanelSources : []),
      ]) {
        const source = batch[name as keyof typeof batch];
        await client.query(
          `INSERT INTO app_reporting_website_source_snapshots
          (query_key, source_name, state, data, fetched_at) VALUES ($1, $2, $3, $4, now())`,
          [identity.queryKey, name, source.state, JSON.stringify(source.data)],
        );
      }
      return { ...identity, leaseToken: token };
    },
  };
}
