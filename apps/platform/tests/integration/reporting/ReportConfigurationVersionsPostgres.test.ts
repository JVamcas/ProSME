import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/platform/database/client", () => ({ getDatabase: vi.fn() }));
vi.mock("@/platform/database/reporting-pool", () => ({
  getReportingPool: vi.fn(),
}));
import type { AuthenticatedUser } from "@/auth/types";
import type { ConfiguredReport } from "@/modules/reporting/domain/Report";
import {
  putReportTemplate,
  checkReportTemplate,
} from "@/modules/reporting/ServerReportDefinitionService";
import {
  getReport,
  getReportRun,
  putReport,
  runReport,
} from "@/modules/reporting/ServerReportService";
import { applicationExportTemplate } from "@/modules/reporting/application/bootstrap/ApplicationExportTemplate";
import {
  reportingRuntimeDatabaseEnabled as enabled,
  reportingRuntimePool as pool,
  installReportingRuntimeFixture,
} from "../../support/ReportingRuntimeDatabaseFixture";

let actor: AuthenticatedUser;
const dates = { startDate: "2026-10-01", endDate: "2026-10-06" };
beforeAll(async () => {
  if (enabled) {
    actor = await installReportingRuntimeFixture();
  }
});
afterAll(async () => {
  await pool.end();
  vi.unstubAllEnvs();
});
async function publishedTemplate() {
  const template = await putReportTemplate(actor, {
    ...applicationExportTemplate,
    key: `version-${crypto.randomUUID()}`,
  });
  await checkReportTemplate(
    actor,
    template.id,
    { rowVersion: 1, values: dates },
    true,
  );
  return template;
}
async function createReport() {
  const template = await publishedTemplate();
  const created = await putReport(actor, {
    key: `version-${crypto.randomUUID()}`,
    name: "Version fixture",
    description: "Configuration version fixture.",
    templateId: template.id,
    format: "CSV",
    defaults: { period: "explicit", values: dates },
  });
  return getReport(actor, created.id);
}
function editInput(report: ConfiguredReport) {
  return {
    key: report.key,
    name: report.name,
    description: report.description,
    templateId: report.templateId,
    defaults: report.defaults,
    format: report.format,
    rowVersion: report.rowVersion,
  };
}
async function versions(id: string) {
  return (
    await pool.query(
      `SELECT version, template_id, template_version, defaults, format
     FROM app_reporting_report_versions WHERE report_id = $1 ORDER BY version`,
      [id],
    )
  ).rows;
}

(enabled ? describe : describe.skip)(
  "immutable report configuration versions",
  () => {
    it("starts at version one and keeps it for name, description and unchanged saves", async () => {
      let report = await createReport();
      expect(report.reportVersion).toBe(1);
      for (const details of [
        { name: "Renamed" },
        { description: "Updated purpose." },
        {},
      ]) {
        await putReport(actor, { ...editInput(report), ...details }, report.id);
        report = await getReport(actor, report.id);
        expect(report.reportVersion).toBe(1);
      }
      expect(report.rowVersion).toBe(4);
      expect(await versions(report.id)).toHaveLength(1);
      const run = await runReport(actor, report.id, {
        idempotencyKey: crypto.randomUUID(),
        values: {},
      });
      expect(
        (await getReportRun(actor, report.id, run.id)).run.reportVersion,
      ).toBe(1);
    });

    it.each(["parameters", "period", "format", "template"] as const)(
      "creates exactly one immutable version when changing %s",
      async (change) => {
        const report = await createReport();
        const input = editInput(report);
        if (change === "parameters") {
          input.defaults = {
            period: "explicit",
            values: { ...dates, fundingCallId: null, lifecycleStatuses: [] },
          };
        } else if (change === "period") {
          input.defaults = { period: "previous-month", values: {} };
        } else if (change === "format") {
          input.format = "XLSX";
        } else {
          input.templateId = (await publishedTemplate()).id;
        }
        await putReport(actor, input, report.id);
        const updated = await getReport(actor, report.id);
        expect(updated.reportVersion).toBe(2);
        const history = await versions(report.id);
        expect(history).toHaveLength(2);
        expect(history[0]).toMatchObject({
          version: 1,
          format: "CSV",
          defaults: report.defaults,
        });
        expect(history[1]).toMatchObject({
          version: 2,
          defaults: updated.defaults,
          format: updated.format,
        });
        await expect(
          pool.query(
            "UPDATE app_reporting_report_versions SET format = 'XLSX' WHERE report_id = $1 AND version = 1",
            [report.id],
          ),
        ).rejects.toThrow("immutable");
        await expect(
          pool.query(
            "DELETE FROM app_reporting_report_versions WHERE report_id = $1 AND version = 1",
            [report.id],
          ),
        ).rejects.toThrow("immutable");
      },
    );

    it("compares JSON values independently of object key order and preserves explicit empty and null defaults", async () => {
      const report = await createReport();
      await putReport(
        actor,
        {
          ...editInput(report),
          defaults: {
            period: "explicit",
            values: { endDate: dates.endDate, startDate: dates.startDate },
          },
        },
        report.id,
      );
      expect((await getReport(actor, report.id)).reportVersion).toBe(1);
    });

    it("keeps the pinned template even when a newer version is published", async () => {
      const report = await createReport();
      await checkReportTemplate(
        actor,
        report.templateId,
        { rowVersion: 2, values: dates },
        true,
      );
      await putReport(
        actor,
        { ...editInput(report), name: "Renamed after publication" },
        report.id,
      );
      expect(await getReport(actor, report.id)).toMatchObject({
        templateVersion: 1,
        reportVersion: 1,
      });
      const created = await putReport(actor, {
        ...editInput(report),
        key: `latest-${crypto.randomUUID()}`,
        rowVersion: undefined,
      });
      expect((await getReport(actor, created.id)).templateVersion).toBe(2);
    });

    it("rejects concurrent stale saves without creating orphaned versions and pins run inputs", async () => {
      const report = await createReport();
      const run = await runReport(actor, report.id, {
        idempotencyKey: crypto.randomUUID(),
        values: {},
      });
      const results = await Promise.allSettled(
        [1, 2].map(() =>
          putReport(actor, { ...editInput(report), format: "XLSX" }, report.id),
        ),
      );
      expect(
        results.filter((result) => result.status === "fulfilled"),
      ).toHaveLength(1);
      expect(
        results.filter((result) => result.status === "rejected"),
      ).toHaveLength(1);
      const updated = await getReport(actor, report.id);
      expect(updated).toMatchObject({ reportVersion: 2, rowVersion: 2 });
      expect(await versions(report.id)).toHaveLength(2);
      expect((await getReportRun(actor, report.id, run.id)).run).toMatchObject({
        reportVersion: 1,
        format: "CSV",
      });
      const next = await runReport(actor, report.id, {
        idempotencyKey: crypto.randomUUID(),
        values: {},
      });
      expect((await getReportRun(actor, report.id, next.id)).run).toMatchObject(
        { reportVersion: 2, format: "XLSX" },
      );
    });

    it("preserves existing configuration versions when the migration is rerun", async () => {
      const report = await createReport();
      await putReport(
        actor,
        { ...editInput(report), name: "Renamed" },
        report.id,
      );
      const renamed = await getReport(actor, report.id);
      await putReport(
        actor,
        { ...editInput(renamed), format: "XLSX" },
        report.id,
      );
      const history = await versions(report.id);
      const migration = await readFile(
        new URL(
          "../../../drizzle/0178_reporting_configuration_versions.sql",
          import.meta.url,
        ),
        "utf8",
      );
      await pool.query(migration);
      expect((await getReport(actor, report.id)).reportVersion).toBe(2);
      expect(await versions(report.id)).toEqual(history);
    });
  },
);
