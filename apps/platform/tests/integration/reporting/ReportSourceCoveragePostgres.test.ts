import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/platform/database/client", () => ({ getDatabase: vi.fn() }));
vi.mock("@/platform/database/reporting-pool", () => ({
  getReportingPool: vi.fn(),
}));
import type { AuthenticatedUser } from "@/auth/types";
import { processReportGeneration } from "@/modules/reporting/ServerReportGenerationService";
import {
  runReport,
  getReportRun,
} from "@/modules/reporting/ServerReportService";
import { createAutomationReport } from "../../support/ReportingAutomationFixture";
import {
  reportingRuntimeDatabaseEnabled as enabled,
  reportingRuntimePool as pool,
  installReportingRuntimeFixture,
  MemoryReportStorage,
} from "../../support/ReportingRuntimeDatabaseFixture";

let actor: AuthenticatedUser;
const storage = new MemoryReportStorage();
beforeAll(async () => {
  if (enabled) actor = await installReportingRuntimeFixture();
});
afterAll(async () => {
  await pool.end();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});
(enabled ? describe : describe.skip)("exact-period source coverage", () => {
  it("keeps provider failure preparing, then records legitimate no-data coverage without invented zeros", async () => {
    const report = await createAutomationReport(actor, true);
    const queued = await runReport(actor, report.id, {
      idempotencyKey: crypto.randomUUID(),
      values: {},
    });
    expect(await processReportGeneration(storage)).toMatchObject({
      preparing: 1,
    });
    const query = (
      await pool.query(
        "SELECT query_key FROM app_reporting_website_queries WHERE start_date = '2026-10-01' AND end_date = '2026-10-14'",
      )
    ).rows[0];
    const sources = [
      "traffic",
      "applicationReach",
      "starterCompletion",
      "applicationFunnel",
      "dailyTraffic",
      "mostViewedPages",
      "geography",
      "fundingCallEngagement",
      "selfCheckJourney",
      "topUserJourneys",
    ];
    await pool.query(
      `INSERT INTO app_reporting_website_source_snapshots(query_key, source_name, state, data, fetched_at, note)
      SELECT $1, source, 'no-data', '{}'::jsonb, now(), 'Legitimate source with no observations'
      FROM unnest($2::text[]) source`,
      [query.query_key, sources],
    );
    await pool.query(
      "UPDATE app_reporting_website_queries SET last_attempt_at = now(), failures = '{\"traffic\":true}' WHERE query_key = $1",
      [query.query_key],
    );
    await pool.query(
      "UPDATE app_reporting_report_runs SET available_at = now() WHERE id = $1",
      [queued.id],
    );
    expect(await processReportGeneration(storage)).toMatchObject({
      preparing: 1,
    });
    await pool.query(
      "UPDATE app_reporting_website_queries SET failures = '{}' WHERE query_key = $1",
      [query.query_key],
    );
    await pool.query(
      "UPDATE app_reporting_report_runs SET available_at = now() WHERE id = $1",
      [queued.id],
    );
    expect(await processReportGeneration(storage)).toMatchObject({
      succeeded: 1,
    });
    const detail = await getReportRun(actor, report.id, queued.id);
    expect(detail.run.sourceCoverage).toMatchObject({
      propertyId: "123",
      startDate: "2026-10-01",
      endDate: "2026-10-14",
      collectionStart: "2026-10-01",
      timezone: "Africa/Windhoek",
      sources: {
        traffic: {
          state: "no-data",
          note: "Legitimate source with no observations",
        },
      },
    });
    const output = (
      await storage.read(detail.artifacts[0].objectKey)
    ).toString();
    const noData = output
      .split("\r\n")
      .filter((row) => row.includes('"no-data"'));
    expect(noData.length).toBeGreaterThan(0);
    for (const row of noData) expect(row.split(",")[3]).toBe('""');
    const captured = detail.run.sourceCoverage;
    await pool.query(
      "UPDATE app_reporting_website_source_snapshots SET note = 'Later synchronization' WHERE query_key = $1",
      [query.query_key],
    );
    expect(
      (await getReportRun(actor, report.id, queued.id)).run.sourceCoverage,
    ).toEqual(captured);
  });

  it("records a terminal error file when exact-period preparation exceeds its deadline", async () => {
    const report = await createAutomationReport(actor, true);
    const queued = await runReport(actor, report.id, {
      idempotencyKey: crypto.randomUUID(),
      values: {},
    });
    await pool.query(
      "UPDATE app_reporting_website_queries SET failures = '{\"traffic\":true}'",
    );
    vi.setSystemTime(new Date(Date.now() + 25 * 3600000));
    try {
      expect(await processReportGeneration(storage)).toMatchObject({
        failed: 1,
      });
      const detail = await getReportRun(actor, report.id, queued.id);
      expect(detail.run.error).toContain("within 24 hours");
      expect(detail.artifacts[0].kind).toBe("ERROR");
      expect(detail.events.map((event) => event.key)).toEqual([
        "reporting.generation.failed",
      ]);
    } finally {
      vi.useRealTimers();
    }
  });
});
