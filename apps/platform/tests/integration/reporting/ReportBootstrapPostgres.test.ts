import { reportTemplateQuery } from "@/modules/reporting/domain/ReportDefinition";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/platform/database/client", () => ({ getDatabase: vi.fn() }));
vi.mock("@/platform/database/reporting-pool", () => ({
  getReportingPool: vi.fn(),
}));
import type { AuthenticatedUser } from "@/auth/types";
import { bootstrapReports } from "@/modules/reporting/ServerReportBootstrapService";
import {
  getReportTemplate,
  putReportTemplate,
  checkReportTemplate,
} from "@/modules/reporting/ServerReportDefinitionService";
import {
  reportBootstrapTemplates,
  reportBootstrapReports,
} from "@/modules/reporting/application/bootstrap/ReportBootstrapInventory";
import { streamReportQuery } from "@/modules/reporting/ServerReportQueryService";
import { findConfiguredReport } from "@/modules/reporting/infrastructure/ReportRepository";
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
});
(enabled ? describe : describe.skip)("explicit reporting bootstrap", () => {
  it("validates and installs exactly seven SQL templates and eight configurations", async () => {
    expect(await bootstrapReports(actor)).toEqual({
      templatesCreated: 7,
      reportsCreated: 8,
    });
    const rows =
      await pool.query(`SELECT report.key, report.description, template.key AS template,
        template.description AS template_description, report.template_version
      FROM app_reporting_reports report JOIN app_reporting_templates template ON template.id = report.template_id`);
    for (const expected of reportBootstrapReports) {
      expect(rows.rows).toContainEqual({
        key: expected.key,
        description: expected.description,
        template: expected.templateKey,
        template_description: reportBootstrapTemplates.find(
          (template) => template.key === expected.templateKey,
        )!.description,
        template_version: 1,
      });
    }
    expect(rows.rows).toHaveLength(8);
    expect(
      (
        await pool.query(
          "SELECT frequency_days, enabled FROM app_reporting_report_schedules ORDER BY frequency_days",
        )
      ).rows,
    ).toEqual([
      { frequency_days: 14, enabled: false },
      { frequency_days: 30, enabled: false },
    ]);
    expect(
      (
        await pool.query(
          "SELECT count(*)::integer AS count FROM app_notification_event_rules WHERE report_id IS NOT NULL AND NOT is_enabled",
        )
      ).rows[0].count,
    ).toBe(24);
    expect(
      (
        await pool.query(
          "SELECT count(*)::integer AS count FROM app_notification_template_versions version JOIN app_notification_template_targets target ON target.id = version.template_target_id JOIN app_notification_events event ON event.id = target.event_id WHERE event.event_key LIKE 'reporting.generation.%' AND version.status = 'PUBLISHED'",
        )
      ).rows[0].count,
    ).toBe(3);
    expect(
      (await pool.query("SELECT version FROM app_reporting_report_versions"))
        .rows,
    ).toEqual(Array.from({ length: 8 }, () => ({ version: 1 })));
    expect(
      reportBootstrapTemplates.map((template) => template.key),
    ).not.toContain("chatbot-analytics");
    expect(
      reportBootstrapTemplates.map((template) => template.key),
    ).not.toContain("outcomes-by-reason");
  });
  it("preserves edited names, drafts, report defaults, versions and execution owner on rerun", async () => {
    await pool.query(
      `UPDATE app_reporting_templates SET name = 'Administrator template', description = 'Administrator template purpose.', definition = definition || '{"sql":"SELECT reference FROM app_reporting_dataset_applications_v1"}'::jsonb, row_version = row_version + 1 WHERE key = 'application-export'`,
    );
    await pool.query(
      `UPDATE app_reporting_reports SET name = 'Administrator report', description = 'Administrator report purpose.', defaults = '{"period":"explicit","values":{"startDate":"2026-10-01","endDate":"2026-10-06"}}', row_version = row_version + 1 WHERE key = 'application-data-export'`,
    );
    const before = await pool.query(
      "SELECT key, name, description, defaults, owner_id, row_version FROM app_reporting_reports ORDER BY key",
    );
    expect(await bootstrapReports(actor)).toEqual({
      templatesCreated: 0,
      reportsCreated: 0,
    });
    expect(
      (
        await pool.query(
          "SELECT key, name, description, defaults, owner_id, row_version FROM app_reporting_reports ORDER BY key",
        )
      ).rows,
    ).toEqual(before.rows);
    expect(
      (
        await pool.query(
          "SELECT name, description FROM app_reporting_templates WHERE key = 'application-export'",
        )
      ).rows[0],
    ).toEqual({
      name: "Administrator template",
      description: "Administrator template purpose.",
    });
    const saved = (
      await pool.query(
        "SELECT id FROM app_reporting_reports WHERE key = 'application-data-export'",
      )
    ).rows[0];
    expect(await findConfiguredReport(saved.id)).toEqual(
      expect.objectContaining({
        name: "Administrator report",
        templateName: "Administrator template",
        datasetName: "Application Data",
        templateVersion: 1,
        definition: reportBootstrapTemplates.find(
          (item) => item.key === "application-export",
        )!.definition,
      }),
    );
  });
  it("reconciles submitted export, completing actor, workload and effective budget SQL semantics", async () => {
    for (const key of [
      "application-export",
      "workflow-turnaround",
      "reviewer-workload",
      "budget-commitments",
    ]) {
      const template = reportBootstrapTemplates.find(
        (item) => item.key === key,
      )!;
      const query = reportTemplateQuery(template.definition);
      const rows: unknown[][] = [];
      await streamReportQuery(
        actor,
        {
          ...query,
          values:
            key === "budget-commitments"
              ? {}
              : { startDate: "2026-10-01", endDate: "2026-10-06" },
        },
        async (batch) => {
          rows.push(...batch);
        },
      );
      expect(rows.length).toBeGreaterThan(0);
      if (key === "application-export") {
        expect(rows).toHaveLength(1);
        expect(rows[0][8]).toBe("9999999999999999.99");
      }
      if (key === "workflow-turnaround") {
        expect(rows.some((row) => row[3] === actor.id)).toBe(true);
      }
      if (key === "budget-commitments") {
        expect(rows.some((row) => row[3] === "12345.67" && row[7] === 0)).toBe(
          true,
        );
      }
    }
  });
  it("applies active stage filters to pipeline/ageing and supports zero-row typed results", async () => {
    for (const key of ["application-pipeline", "application-ageing"]) {
      const query = reportTemplateQuery(
        reportBootstrapTemplates.find((item) => item.key === key)!.definition,
      );
      const rows: unknown[][] = [];
      await streamReportQuery(
        actor,
        { ...query, values: {} },
        async (batch) => {
          rows.push(...batch);
        },
      );
      expect(rows).toEqual([]);
    }
  });
  it("refuses to recreate a missing report with defaults incompatible with an edited published template", async () => {
    const rows = await pool.query(
      "SELECT id FROM app_reporting_templates WHERE key = 'website-analytics'",
    );
    const template = await getReportTemplate(actor, rows.rows[0].id);
    const draft = await putReportTemplate(
      actor,
      {
        key: template.key,
        name: template.name,
        description: template.description,
        rowVersion: template.rowVersion,
        definition: { ...template.definition, formats: ["CSV"] },
      },
      template.id,
    );
    await checkReportTemplate(
      actor,
      template.id,
      {
        rowVersion: draft.rowVersion,
        values: { startDate: "2026-10-01", endDate: "2026-10-06" },
      },
      true,
    );
    // Remove the bootstrap key from the catalogue while retaining immutable
    // configuration history for the existing fixture report.
    await pool.query(
      "UPDATE app_reporting_reports SET key = 'fixture-website-monthly' WHERE key = 'website-monthly'",
    );
    await expect(bootstrapReports(actor)).rejects.toThrow("format");
    expect(
      (
        await pool.query(
          "SELECT count(*)::integer AS total FROM app_reporting_reports WHERE key = 'website-monthly'",
        )
      ).rows[0].total,
    ).toBe(0);
    expect((await getReportTemplate(actor, template.id)).publishedVersion).toBe(
      2,
    );
  });
});
