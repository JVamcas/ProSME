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
import { readStoredWebsiteAnalytics } from "@/modules/reporting/infrastructure/WebsiteAnalyticsSnapshotRepository";
import { previousWebsiteAnalyticsPeriod } from "@/modules/reporting/domain/WebsiteAnalyticsComparison";
import {
  createReportingDatabaseFixture,
  reportingConfiguration,
  reportingDatabaseEnabled,
  reportingPeriod,
} from "../../support/WebsiteAnalyticsDatabaseFixture";

const fixture = createReportingDatabaseFixture();
beforeAll(() => fixture.prepare());
beforeEach(async () => {
  if (reportingDatabaseEnabled) await fixture.reset();
});
afterAll(() => fixture.finish());

(reportingDatabaseEnabled ? describe : describe.skip)(
  "durable website SQL projection",
  () => {
    it("registers exact current/comparison scopes and projects all sources in one statement", async () => {
      const database = getDatabase();
      const execute = vi.spyOn(database, "execute");
      const result = await readStoredWebsiteAnalytics(
        reportingPeriod,
        reportingConfiguration,
      );
      expect(execute).toHaveBeenCalledTimes(1);
      execute.mockRestore();
      expect(result.current.sources.traffic).toMatchObject({
        state: "unavailable",
        data: null,
      });
      expect(result.current.sources.topUserJourneys).toMatchObject({
        state: "unavailable",
        data: null,
      });
      expect(result.current.synchronization.state).toBe("pending");
      expect(result.previous).not.toBeNull();
      expect(result.current.changes.visitors).toBeNull();
      const jobs = await fixture.client.query(
        "SELECT start_date::text, end_date::text, include_panels FROM app_reporting_website_queries ORDER BY start_date DESC",
      );
      expect(jobs.rows).toEqual([
        {
          start_date: "2026-10-01",
          end_date: "2026-10-06",
          include_panels: true,
        },
        {
          start_date: "2026-09-25",
          end_date: "2026-09-30",
          include_panels: false,
        },
      ]);
    });

    it("uses exact GA totals and calculates previous-period changes in SQL", async () => {
      await fixture.seed(reportingPeriod, 118);
      await fixture.seed(
        previousWebsiteAnalyticsPeriod(reportingPeriod),
        100,
        false,
      );
      const result = await readStoredWebsiteAnalytics(
        reportingPeriod,
        reportingConfiguration,
      );
      expect(result.current.sources.traffic.data?.visitors).toBe(118);
      expect(result.current.changes.visitors).toBeCloseTo(0.18);
      expect(result.current.changes.pageViews).toBeCloseTo(0.18);
      expect(result.current.changes.conversion).toBe(0);
    });

    it("persists and projects ordered journey steps while isolating a journey refresh failure", async () => {
      await fixture.seed(reportingPeriod);
      const data = {
        rows: [
          {
            steps: ["funding", "call_details", "start_application"],
            users: 42,
          },
          { steps: ["resources", "call_details"], users: 12 },
        ],
        totalRows: 5,
        truncated: true,
      };
      await fixture.client.query(
        "UPDATE app_reporting_website_source_snapshots SET data = $1, state = 'ready' WHERE source_name = 'topUserJourneys'",
        [JSON.stringify(data)],
      );
      let result = await readStoredWebsiteAnalytics(
        reportingPeriod,
        reportingConfiguration,
      );
      expect(result.current.sources.topUserJourneys).toMatchObject({
        state: "ready",
        data,
      });
      await fixture.client.query(
        `UPDATE app_reporting_website_queries SET failures = '{"topUserJourneys": "failed"}'::jsonb`,
      );
      result = await readStoredWebsiteAnalytics(
        reportingPeriod,
        reportingConfiguration,
      );
      expect(result.current.sources.topUserJourneys).toMatchObject({
        state: "stale",
        data,
      });
      expect(result.current.sources.traffic.state).toBe("ready");
    });

    it("isolates funding-call scope and uses inclusive local eligibility date bounds", async () => {
      const callA = "00000000-0000-4000-8000-000000000001";
      const callB = "00000000-0000-4000-8000-000000000002";
      const period = { ...reportingPeriod, fundingCallId: callA };
      await fixture.seed(period, 20);
      await fixture.seed({ ...reportingPeriod, fundingCallId: callB }, 30);
      await fixture.client.query(
        `INSERT INTO app_reporting_anonymous_eligibility_checks VALUES
      ($1, 'likely-eligible', '2026-09-30T21:59:59Z'),
      ($1, 'likely-eligible', '2026-09-30T22:00:00Z'),
      ($1, 'likely-eligible', '2026-10-06T21:59:59Z'),
      ($1, 'likely-eligible', '2026-10-06T22:00:00Z'),
      ($2, 'review-required', '2026-10-01T12:00:00Z')`,
        [callA, callB],
      );
      const result = await readStoredWebsiteAnalytics(
        period,
        reportingConfiguration,
      );
      expect(result.current.sources.traffic.data?.visitors).toBe(20);
      expect(result.current.eligibility).toEqual([
        { outcome: "likely-eligible", checks: 2 },
      ]);
    });

    it("marks old persisted data stale and suppresses unsupported comparisons", async () => {
      await fixture.seed(reportingPeriod);
      await fixture.seed(
        previousWebsiteAnalyticsPeriod(reportingPeriod),
        0,
        false,
      );
      await fixture.client.query(
        "UPDATE app_reporting_website_source_snapshots SET fetched_at = now() - interval '11 minutes' WHERE source_name = 'traffic'",
      );
      const result = await readStoredWebsiteAnalytics(
        reportingPeriod,
        reportingConfiguration,
      );
      expect(result.current.sources.traffic).toMatchObject({
        state: "stale",
        data: { visitors: 100 },
      });
      expect(result.current.changes.visitors).toBeNull();
      const beforeCollection = await readStoredWebsiteAnalytics(
        reportingPeriod,
        {
          ...reportingConfiguration,
          collectionStart: "2026-10-01",
        },
      );
      expect(beforeCollection.previous).toBeNull();
      expect(beforeCollection.current.sources.traffic.data).toBeNull();
    });
  },
);
