import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/platform/database/client", () => ({ getDatabase: vi.fn() }));
import { getDatabase } from "@/platform/database/client";
import {
  reportingConfiguration,
  reportingDatabaseEnabled,
} from "../../support/WebsiteAnalyticsDatabaseFixture";
import { createWebsiteReportDatabaseFixture } from "../../support/WebsiteReportDatabaseFixture";
import {
  claimDueWebsiteReport,
  deferWebsiteReport,
} from "@/modules/reporting/infrastructure/WebsiteReportClaimRepository";
import { processWebsiteReports } from "@/modules/reporting/ServerWebsiteReportProcessorService";

const fixture = createWebsiteReportDatabaseFixture();
beforeAll(() => fixture.prepare());
beforeEach(async () => {
  if (reportingDatabaseEnabled) await fixture.reset();
  vi.stubEnv("REPORTING_PROCESSOR_SECRET", "a".repeat(32));
  vi.stubEnv("GA_PROPERTY_ID", reportingConfiguration.propertyId);
  vi.stubEnv("GA_PROPERTY_TIMEZONE", reportingConfiguration.timezone);
  vi.stubEnv(
    "GA_COLLECTION_START_DATE",
    reportingConfiguration.collectionStart,
  );
});
afterAll(() => fixture.finish());

(reportingDatabaseEnabled ? describe : describe.skip)(
  "report processor concurrency and recovery",
  () => {
    it("uses independent database connections to allow only one claim of a due period", async () => {
      await fixture.due();
      const schema = (
        await fixture.client.query("SELECT current_schema() AS schema")
      ).rows[0].schema;
      const pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        options: `-c search_path=${schema}`,
        max: 2,
      });
      vi.mocked(getDatabase).mockReturnValue(
        drizzle(pool) as ReturnType<typeof getDatabase>,
      );
      try {
        const claims = await Promise.all([
          claimDueWebsiteReport(reportingConfiguration),
          claimDueWebsiteReport(reportingConfiguration),
        ]);
        expect(claims.filter(Boolean)).toHaveLength(1);
        expect(
          (
            await fixture.client.query(
              "SELECT count(*)::int AS count FROM app_reporting_runs",
            )
          ).rows[0].count,
        ).toBe(1);
      } finally {
        await pool.end();
        await fixture.reconnect();
      }
    });

    it("queues exact sources and resumes the same persisted run through to atomic generation", async () => {
      await fixture.due();
      const authorization = `Bearer ${"a".repeat(32)}`;
      expect(await processWebsiteReports(authorization)).toEqual({
        claimed: 1,
        generated: 0,
        waiting: 1,
        failed: 0,
      });
      await fixture.client.query(
        "UPDATE app_reporting_runs SET retry_at = now() - interval '1 second'",
      );
      const job = (await claimDueWebsiteReport(reportingConfiguration))!;
      await fixture.sources(job);
      await deferWebsiteReport(job, "Source synchronization completed");
      await fixture.client.query(
        "UPDATE app_reporting_runs SET retry_at = now() - interval '1 second'",
      );
      expect(await processWebsiteReports(authorization)).toEqual({
        claimed: 1,
        generated: 1,
        waiting: 0,
        failed: 0,
      });
      expect(
        (await fixture.client.query("SELECT id, state FROM app_reporting_runs"))
          .rows,
      ).toEqual([{ id: job.id, state: "GENERATED" }]);
      expect(
        (
          await fixture.client.query(
            "SELECT count(*)::int AS count FROM app_notification_outbox",
          )
        ).rows[0].count,
      ).toBe(1);
      // At most one overdue period is generated per invocation; the next month is separately queued.
      expect(
        (
          await fixture.client.query(
            "SELECT next_period_start::text FROM app_reporting_schedules WHERE frequency = 'MONTHLY'",
          )
        ).rows[0].next_period_start,
      ).toBe("2026-10-01");
    });
  },
);
