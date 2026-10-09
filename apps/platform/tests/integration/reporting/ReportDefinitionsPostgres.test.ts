import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/platform/database/client", () => ({ getDatabase: vi.fn() }));
vi.mock("@/platform/database/reporting-pool", () => ({
  getReportingPool: vi.fn(),
}));
import type { AuthenticatedUser } from "@/auth/types";
import { permissionCodes as p } from "@/auth/authorization/permissions";
import {
  putReportTemplate,
  checkReportTemplate,
  getReportTemplate,
  getReportTemplates,
} from "@/modules/reporting/ServerReportDefinitionService";
import {
  getReport,
  getReports,
  putReport,
} from "@/modules/reporting/ServerReportService";
import { applicationExportTemplate } from "@/modules/reporting/application/bootstrap/ApplicationExportTemplate";
import { findPublishedReportTemplate } from "@/modules/reporting/infrastructure/ReportTemplateRepository";
import {
  reportingRuntimeDatabaseEnabled as enabled,
  reportingRuntimePool as pool,
  installReportingRuntimeFixture,
} from "../../support/ReportingRuntimeDatabaseFixture";

let actor: AuthenticatedUser;
const dates = { startDate: "2026-10-01", endDate: "2026-10-06" };
beforeAll(async () => {
  if (enabled) actor = await installReportingRuntimeFixture();
});
afterAll(async () => {
  await pool.end();
  vi.unstubAllEnvs();
});
async function draft() {
  return putReportTemplate(actor, {
    ...applicationExportTemplate,
    key: `test-${crypto.randomUUID()}`,
  });
}
(enabled ? describe : describe.skip)(
  "report definitions and immutable publication",
  () => {
    it("denies anonymous, missing operation and missing source grants before writes", async () => {
      await expect(
        putReportTemplate(null, applicationExportTemplate),
      ).rejects.toThrow("Authentication");
      await expect(
        putReportTemplate(
          { ...actor, capabilities: new Set([p.reportingTemplateCreateAll]) },
          applicationExportTemplate,
        ),
      ).rejects.toThrow("Missing");
      const suspended = { ...actor, status: "suspended" as const };
      await expect(
        getReportTemplates(suspended, { search: "", page: 1, pageSize: 10 }),
      ).rejects.toThrow("Missing");
    });
    it("validates actual PostgreSQL output names/types even for a zero-row query", async () => {
      const template = await draft();
      await expect(
        checkReportTemplate(actor, template.id, {
          rowVersion: 1,
          values: dates,
        }),
      ).resolves.toEqual({ valid: true });
      const changed = await putReportTemplate(
        actor,
        {
          ...template,
          definition: {
            ...template.definition,
            columns: template.definition.columns.map((column) =>
              column.name === "reference"
                ? { ...column, type: "integer" as const }
                : column,
            ),
          },
          key: template.key,
          name: template.name,
          description: template.description,
          rowVersion: 1,
        },
        template.id,
      ).catch(() => null);
      // Strict transport rejects response metadata, rather than accepting it as editable input.
      expect(changed).toBeNull();
      const saved = await putReportTemplate(
        actor,
        {
          key: template.key,
          name: template.name,
          description: template.description,
          rowVersion: 1,
          definition: {
            ...template.definition,
            columns: [{ name: "reference", type: "integer" }],
            sql: "SELECT reference FROM app_reporting_dataset_applications_v1 WHERE false",
            parameters: [],
          },
        },
        template.id,
      );
      await expect(
        checkReportTemplate(actor, saved.id, {
          rowVersion: saved.rowVersion,
          values: {},
        }),
      ).rejects.toThrow("types");
    });
    it("publishes exactly one version for concurrent publication of the same validated draft", async () => {
      const template = await draft();
      const results = await Promise.allSettled(
        [1, 2].map(() =>
          checkReportTemplate(
            actor,
            template.id,
            { rowVersion: 1, values: dates },
            true,
          ),
        ),
      );
      expect(
        results.filter((result) => result.status === "fulfilled"),
      ).toHaveLength(1);
      expect(
        results.filter((result) => result.status === "rejected"),
      ).toHaveLength(1);
      expect(
        (await getReportTemplate(actor, template.id)).publishedVersion,
      ).toBe(1);
      await expect(
        pool.query(
          "UPDATE app_reporting_template_versions SET definition = '{}' WHERE template_id = $1",
          [template.id],
        ),
      ).rejects.toThrow("immutable");
    });
    it("draft edits preserve a published version and stale draft writes fail", async () => {
      const template = await draft();
      await checkReportTemplate(
        actor,
        template.id,
        { rowVersion: 1, values: dates },
        true,
      );
      const published = await findPublishedReportTemplate(template.id, 1);
      await putReportTemplate(
        actor,
        {
          key: template.key,
          name: "Changed draft",
          description: "Updated application export description.",
          definition: template.definition,
          rowVersion: 2,
        },
        template.id,
      );
      expect(
        (await findPublishedReportTemplate(template.id, 1))?.definition,
      ).toEqual(published?.definition);
      await expect(
        putReportTemplate(
          actor,
          {
            key: template.key,
            name: "Stale",
            description: template.description,
            definition: template.definition,
            rowVersion: 2,
          },
          template.id,
        ),
      ).rejects.toThrow("changed");
      await expect(
        checkReportTemplate(
          actor,
          template.id,
          { rowVersion: 2, values: dates },
          true,
        ),
      ).rejects.toThrow("changed");
    });
    it("lists/searches/pages catalogue projections in SQL", async () => {
      const template = await draft();
      const page = await getReportTemplates(actor, {
        search: template.name,
        page: 1,
        pageSize: 1,
      });
      expect(page.items).toHaveLength(1);
      expect(page.total).toBeGreaterThan(1);
      expect(page.items[0]).not.toHaveProperty("definition");
      expect(page.items[0].description).toBe(template.description);
      expect(
        (
          await getReportTemplates(actor, {
            search: "missing-template-unique",
            page: 2,
            pageSize: 1,
          })
        ).items,
      ).toEqual([]);
    });
    it("requires published versions and typed defaults for configured reports", async () => {
      const template = await draft();
      const input = {
        key: `report-${crypto.randomUUID()}`,
        name: "Test report",
        description: "Fixture application export.",
        templateId: template.id,
        templateVersion: 1,
        defaults: { period: "explicit" as const, values: dates },
        format: "CSV" as const,
      };
      await expect(putReport(actor, input)).rejects.toThrow("published");
      await checkReportTemplate(
        actor,
        template.id,
        { rowVersion: 1, values: dates },
        true,
      );
      await expect(
        putReport(actor, {
          ...input,
          defaults: {
            period: "explicit",
            values: { ...dates, lifecycleStatuses: "invalid" },
          },
        }),
      ).rejects.toThrow();
      const created = await putReport(actor, input);
      expect((await getReport(actor, created.id)).description).toBe(
        input.description,
      );
      const catalogue = await getReports(actor, {
        search: input.name,
        page: 1,
        pageSize: 1,
      });
      expect(catalogue.items[0].description).toBe(input.description);
      const updated = await putReport(
        actor,
        {
          ...input,
          description: "Updated application export purpose.",
          rowVersion: 1,
        },
        created.id,
      );
      expect((await getReport(actor, updated.id)).description).toBe(
        "Updated application export purpose.",
      );
      expect((await getReport(actor, created.id)).definition).toEqual(
        template.definition,
      );
      await expect(
        putReport(actor, { ...input, rowVersion: 1 }, created.id),
      ).rejects.toThrow("changed");
    });
  },
);
