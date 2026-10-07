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
import { readStoredWebsiteAnalytics } from "@/modules/reporting/infrastructure/WebsiteAnalyticsSnapshotRepository";
import {
  claimWebsiteAnalyticsSync,
  saveWebsiteAnalyticsSync,
} from "@/modules/reporting/infrastructure/WebsiteAnalyticsSyncRepository";
import {
  createReportingDatabaseFixture,
  fullBatch,
  reportingConfiguration,
  reportingDatabaseEnabled,
  reportingPeriod,
  storedSource,
} from "../../support/WebsiteAnalyticsDatabaseFixture";

const fixture = createReportingDatabaseFixture();
beforeAll(() => fixture.prepare());
beforeEach(async () => {
  if (reportingDatabaseEnabled) await fixture.reset();
});
afterAll(() => fixture.finish());

(reportingDatabaseEnabled ? describe : describe.skip)(
  "reporting synchronization persistence",
  () => {
    it("retains failed source data, saves independent successes and recovers on retry", async () => {
      const job = await fixture.seed();
      const batch = fullBatch(200);
      const failure = {
        state: "failure" as const,
        data: null,
        fetchedAt: null,
        metadata: null,
        note: "secret provider response",
      };
      expect(
        await saveWebsiteAnalyticsSync(job, { ...batch, traffic: failure }),
      ).toBe(true);
      const report = await readStoredWebsiteAnalytics(
        reportingPeriod,
        reportingConfiguration,
      );
      expect(report.current.sources.traffic).toMatchObject({
        state: "stale",
        data: { visitors: 100 },
      });
      expect(report.current.sources.applicationReach.state).toBe("ready");
      expect(report.current.synchronization.state).toBe("partial");
      expect(JSON.stringify(report)).not.toContain("secret");
      const persisted = await fixture.client.query(
        "SELECT data FROM app_reporting_website_source_snapshots WHERE source_name = 'traffic'",
      );
      expect(persisted.rows[0].data.visitors).toBe(100);
      await fixture.client.query(
        "UPDATE app_reporting_website_queries SET next_due_at = '1970-01-01' WHERE query_key = $1",
        [job.queryKey],
      );
      const retry = await claimWebsiteAnalyticsSync(reportingConfiguration);
      expect(retry?.queryKey).toBe(job.queryKey);
      expect(await saveWebsiteAnalyticsSync(retry!, batch)).toBe(true);
      const recovered = await readStoredWebsiteAnalytics(
        reportingPeriod,
        reportingConfiguration,
      );
      expect(recovered.current.sources.traffic).toMatchObject({
        state: "ready",
        data: { visitors: 200 },
      });
    });

    it("claims one due report, excludes leased reports and rejects a superseded worker", async () => {
      const job = await fixture.seed();
      expect(
        await claimWebsiteAnalyticsSync(reportingConfiguration),
      ).toBeNull();
      await fixture.client.query(
        "UPDATE app_reporting_website_queries SET lease_expires_at = now() - interval '1 second'",
      );
      const reclaimed = await claimWebsiteAnalyticsSync(reportingConfiguration);
      expect(reclaimed?.leaseToken).not.toBe(job.leaseToken);
      expect(await saveWebsiteAnalyticsSync(job, fullBatch(999))).toBe(false);
      expect(
        await claimWebsiteAnalyticsSync(reportingConfiguration),
      ).toBeNull();
      expect(await saveWebsiteAnalyticsSync(reclaimed!, fullBatch(50))).toBe(
        true,
      );
      expect(
        (
          await readStoredWebsiteAnalytics(
            reportingPeriod,
            reportingConfiguration,
          )
        ).current.sources.traffic.data?.visitors,
      ).toBe(50);
    });

    it("persists genuine empty results and undefined zero-denominator conversion", async () => {
      const job = await fixture.seed();
      await saveWebsiteAnalyticsSync(job, {
        ...fullBatch(0),
        starterCompletion: storedSource(
          { startedUsers: 0, submittedUsers: 0, rate: null },
          "unavailable",
        ),
      });
      const report = await readStoredWebsiteAnalytics(
        reportingPeriod,
        reportingConfiguration,
      );
      expect(report.current.sources.dailyTraffic).toMatchObject({
        state: "no-data",
        data: [],
      });
      expect(report.current.sources.starterCompletion).toMatchObject({
        state: "unavailable",
        data: { rate: null },
      });
    });

    it("serves the same persisted report after replacing the database client", async () => {
      const job = await fixture.seed();
      await saveWebsiteAnalyticsSync(job, fullBatch(125));
      const before = await readStoredWebsiteAnalytics(
        reportingPeriod,
        reportingConfiguration,
      );
      await fixture.reconnect();
      const after = await readStoredWebsiteAnalytics(
        reportingPeriod,
        reportingConfiguration,
      );
      expect(after.current.sources).toEqual(before.current.sources);
    });
  },
);
