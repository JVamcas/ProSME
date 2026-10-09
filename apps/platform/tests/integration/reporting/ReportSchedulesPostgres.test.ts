import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/platform/database/client", () => ({ getDatabase: vi.fn() }));
vi.mock("@/platform/database/reporting-pool", () => ({
  getReportingPool: vi.fn(),
}));
import type { AuthenticatedUser } from "@/auth/types";
import { permissionCodes } from "@/auth/authorization/permissions";
import {
  processReportSchedules,
  putReportSchedule,
  getReportSchedules,
} from "@/modules/reporting/ServerReportScheduleService";
import { processReportGeneration } from "@/modules/reporting/ServerReportGenerationService";
import {
  getReportRun,
  runReport,
  retryReportRun,
} from "@/modules/reporting/ServerReportService";
import { claimReportSchedule } from "@/modules/reporting/infrastructure/ReportScheduleRepository";
import { seedReportSchedules } from "@/modules/reporting/infrastructure/ReportScheduleBootstrapRepository";
import {
  createAutomationReport,
  automationDates,
  installAutomationNotifications,
  configureAutomationEvent,
} from "../../support/ReportingAutomationFixture";
import {
  reportingRuntimeDatabaseEnabled as enabled,
  reportingRuntimePool as pool,
  installReportingRuntimeFixture,
  MemoryReportStorage,
} from "../../support/ReportingRuntimeDatabaseFixture";

let actor: AuthenticatedUser;
const storage = new MemoryReportStorage();
const scheduleInput = {
  frequencyDays: 14,
  anchor: automationDates.startDate,
  timezone: "Africa/Windhoek",
  sendTime: "09:00",
  enabled: true,
};
const tick = "2026-11-20T12:00:00Z";
beforeAll(async () => {
  if (enabled) {
    actor = await installReportingRuntimeFixture();
    await installAutomationNotifications(actor);
  }
});
afterAll(async () => {
  await pool.end();
  vi.unstubAllEnvs();
});

(enabled ? describe : describe.skip)(
  "report schedule persistence and recovery",
  () => {
    it("requires schedule permission and a matching website source timezone/collection start", async () => {
      const report = await createAutomationReport(actor, true);
      await expect(
        putReportSchedule(
          { ...actor, capabilities: new Set() },
          report.id,
          scheduleInput,
        ),
      ).rejects.toThrow();
      await expect(
        putReportSchedule(actor, report.id, {
          ...scheduleInput,
          timezone: "UTC",
        }),
      ).rejects.toThrow("source timezone");
      await expect(
        putReportSchedule(actor, report.id, {
          ...scheduleInput,
          anchor: "2026-09-01",
        }),
      ).rejects.toThrow("collection");
      await expect(
        putReportSchedule(actor, report.id, scheduleInput),
      ).rejects.toThrow("success email");
      await configureAutomationEvent(
        actor,
        report.id,
        "reporting.generation.completed",
      );
      const schedule = await putReportSchedule(actor, report.id, scheduleInput);
      await processReportSchedules(tick);
      expect(await processReportGeneration(storage)).toMatchObject({
        preparing: 1,
      });
      const [saved] = await getReportSchedules(actor, report.id);
      expect(saved.id).toBe(schedule.id);
      expect(saved.cursor).toBe(scheduleInput.anchor);
      expect(
        (await getReportRun(actor, report.id, saved.pendingRunId!)).run.status,
      ).toBe("PREPARING_SOURCE");
      expect(
        (
          await pool.query(
            "SELECT start_date::text, end_date::text FROM app_reporting_website_queries WHERE include_panels",
          )
        ).rows,
      ).toContainEqual({
        start_date: automationDates.startDate,
        end_date: automationDates.endDate,
      });
      expect(await processReportSchedules(tick)).toMatchObject({ queued: 0 });
      // Configuration failure is terminal; the run records its error before cursor recovery.
      vi.stubEnv("GA_PROPERTY_ID", "456");
      await pool.query(
        "UPDATE app_reporting_report_runs SET available_at = now() WHERE id = $1",
        [saved.pendingRunId],
      );
      expect(await processReportGeneration(storage)).toMatchObject({
        failed: 1,
      });
      vi.stubEnv("GA_PROPERTY_ID", "123");
      expect(
        (await getReportRun(actor, report.id, saved.pendingRunId!)).events.map(
          (event) => event.key,
        ),
      ).toEqual(["reporting.generation.failed"]);
      await putReportSchedule(
        actor,
        report.id,
        { ...scheduleInput, enabled: false, rowVersion: saved.rowVersion },
        saved.id,
      );
    });

    it("recovers an expired schedule claim and pins one period across concurrent ticks", async () => {
      const report = await createAutomationReport(actor);
      await putReportSchedule(actor, report.id, scheduleInput);
      const claim = await claimReportSchedule(tick);
      expect(claim?.reportId).toBe(report.id);
      await pool.query(
        "UPDATE app_reporting_report_schedules SET lease_until = now() - interval '1 second' WHERE id = $1",
        [claim!.id],
      );
      await Promise.all([
        processReportSchedules(tick),
        processReportSchedules(tick),
      ]);
      let [saved] = await getReportSchedules(actor, report.id);
      const scheduledId = saved.pendingRunId!;
      const scheduled = await getReportRun(actor, report.id, scheduledId);
      expect(scheduled.run).toMatchObject({
        trigger: "SYSTEM",
        actorId: report.ownerId,
        scheduleVersion: 1,
        values: automationDates,
      });
      expect(
        (
          await pool.query(
            "SELECT id FROM app_reporting_report_runs WHERE schedule_id = $1",
            [saved.id],
          )
        ).rowCount,
      ).toBe(1);
      await processReportGeneration(storage);
      const manual = await runReport(actor, report.id, {
        idempotencyKey: crypto.randomUUID(),
        values: automationDates,
      });
      await processReportGeneration(storage);
      const scheduledDetail = await getReportRun(actor, report.id, scheduledId);
      const manualDetail = await getReportRun(actor, report.id, manual.id);
      expect(
        await storage.read(scheduledDetail.artifacts[0].objectKey),
      ).toEqual(await storage.read(manualDetail.artifacts[0].objectKey));
      await processReportSchedules(tick);
      [saved] = await getReportSchedules(actor, report.id);
      expect(saved.cursor).toBe("2026-10-15");
      expect(saved.pendingRunId).not.toBe(scheduledId);
      await putReportSchedule(
        actor,
        report.id,
        { ...scheduleInput, enabled: false, rowVersion: saved.rowVersion },
        saved.id,
      );
      await processReportGeneration(storage);
    });

    it("creates an explicitly linked retry preserving the original period and configuration", async () => {
      const report = await createAutomationReport(actor);
      const manual = await runReport(actor, report.id, {
        idempotencyKey: crypto.randomUUID(),
        values: {},
      });
      storage.failWrites = true;
      await processReportGeneration(storage);
      storage.failWrites = false;
      const key = crypto.randomUUID();
      const retry = await retryReportRun(actor, report.id, manual.id, {
        idempotencyKey: key,
      });
      expect(
        await retryReportRun(actor, report.id, manual.id, {
          idempotencyKey: key,
        }),
      ).toEqual(retry);
      await processReportGeneration(storage);
      const detail = await getReportRun(actor, report.id, retry.id);
      expect(detail.run).toMatchObject({
        retryOf: manual.id,
        values: automationDates,
        templateVersion: 1,
        reportVersion: 1,
        status: "SUCCEEDED",
      });
      expect((await getReportRun(actor, report.id, manual.id)).run.status).toBe(
        "FAILED",
      );
    });

    it("rechecks the execution owner's grants and records a terminal failure", async () => {
      const report = await createAutomationReport(actor);
      await putReportSchedule(actor, report.id, scheduleInput);
      await processReportSchedules(tick);
      const [saved] = await getReportSchedules(actor, report.id);
      const removed = await pool.query(
        `DELETE FROM app_role_capabilities WHERE capability_id IN (SELECT id FROM app_capabilities WHERE code = $1) RETURNING role_id, capability_id`,
        [permissionCodes.reportingQueryExecuteAll],
      );
      try {
        expect(await processReportGeneration(storage)).toMatchObject({
          failed: 1,
        });
        expect(
          (await getReportRun(actor, report.id, saved.pendingRunId!)).run.error,
        ).toContain("no longer");
      } finally {
        for (const row of removed.rows)
          await pool.query(
            "INSERT INTO app_role_capabilities(role_id, capability_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            [row.role_id, row.capability_id],
          );
      }
      await processReportSchedules(tick);
      const [advanced] = await getReportSchedules(actor, report.id);
      expect(advanced.cursor).toBe("2026-10-15");
      await putReportSchedule(
        actor,
        report.id,
        { ...scheduleInput, enabled: false, rowVersion: advanced.rowVersion },
        advanced.id,
      );
      await processReportGeneration(storage);
    });

    it("preserves an edited schedule on bootstrap rerun", async () => {
      await seedReportSchedules({
        collectionStart: "2026-10-01",
        timezone: "Africa/Windhoek",
      });
      const report = await createAutomationReport(actor);
      await putReportSchedule(actor, report.id, {
        ...scheduleInput,
        enabled: false,
      });
      const before = await getReportSchedules(actor, report.id);
      await seedReportSchedules({
        collectionStart: "2026-10-02",
        timezone: "UTC",
      });
      expect(await getReportSchedules(actor, report.id)).toEqual(before);
    });
  },
);
