import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/platform/database/client", () => ({ getDatabase: vi.fn() }));
vi.mock("@/platform/database/reporting-pool", () => ({
  getReportingPool: vi.fn(),
}));

import type { AuthenticatedUser } from "@/auth/types";
import {
  getReport,
  putReport,
  runReport,
  getReportRun,
} from "@/modules/reporting/ServerReportService";
import { putReportSchedule } from "@/modules/reporting/ServerReportScheduleService";
import { findLatestCompletedSchedulePeriod } from "@/modules/reporting/infrastructure/ReportScheduleRepository";
import { createAutomationReport } from "../../support/ReportingAutomationFixture";
import {
  reportingRuntimeDatabaseEnabled as enabled,
  reportingRuntimePool as pool,
  installReportingRuntimeFixture,
} from "../../support/ReportingRuntimeDatabaseFixture";

let actor: AuthenticatedUser;
beforeAll(async () => {
  if (enabled) actor = await installReportingRuntimeFixture();
});
afterAll(async () => {
  await pool.end();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});
const source = { timezone: "Africa/Windhoek", collectionStart: "2026-10-01" };
const runAt = "2026-11-20T12:00:00Z";

(enabled ? describe : describe.skip)("completed schedule defaults", () => {
  it.each([
    {
      frequencyDays: 14,
      startDate: "2026-10-29",
      endDate: "2026-11-11",
    },
    {
      frequencyDays: 30,
      startDate: "2026-10-01",
      endDate: "2026-10-30",
    },
  ])(
    "projects the latest complete $frequencyDays-day period and ignores changed source scope",
    async ({ frequencyDays, startDate, endDate }) => {
      const report = await createAutomationReport(actor, true);
      expect(
        await findLatestCompletedSchedulePeriod(report.id, runAt, source),
      ).toBeNull();
      await putReportSchedule(actor, report.id, {
        frequencyDays,
        timezone: source.timezone,
        anchor: source.collectionStart,
        sendTime: "09:00",
        enabled: false,
      });
      expect(
        await findLatestCompletedSchedulePeriod(report.id, runAt, source),
      ).toEqual({ startDate, endDate });
      expect(
        await findLatestCompletedSchedulePeriod(
          report.id,
          "2026-10-01T12:00:00Z",
          source,
        ),
      ).toBeNull();
      expect(
        await findLatestCompletedSchedulePeriod(report.id, runAt, {
          ...source,
          timezone: "UTC",
        }),
      ).toBeNull();
    },
  );

  it("uses the same completed period for manual form defaults and queued values", async () => {
    const report = await createAutomationReport(actor, true);
    await putReport(
      actor,
      {
        key: report.key,
        name: report.name,
        description: report.description,
        templateId: report.templateId,
        defaults: { period: "website-completed", values: {} },
        format: report.format,
        rowVersion: report.rowVersion,
      },
      report.id,
    );
    await putReportSchedule(actor, report.id, {
      frequencyDays: 14,
      timezone: source.timezone,
      anchor: source.collectionStart,
      sendTime: "09:00",
      enabled: false,
    });
    vi.setSystemTime(new Date(runAt));
    try {
      const expected = { startDate: "2026-10-29", endDate: "2026-11-11" };
      expect((await getReport(actor, report.id)).runDefaults).toEqual(expected);
      const queued = await runReport(actor, report.id, {
        idempotencyKey: crypto.randomUUID(),
        values: {},
      });
      expect(
        (await getReportRun(actor, report.id, queued.id)).run.values,
      ).toEqual(expected);
    } finally {
      vi.useRealTimers();
    }
  });
});
