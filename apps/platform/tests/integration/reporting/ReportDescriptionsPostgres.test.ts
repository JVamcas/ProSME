import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/platform/database/client", () => ({ getDatabase: vi.fn() }));
import { drizzle } from "drizzle-orm/node-postgres";
import { getDatabase } from "@/platform/database/client";
import { findReportDataset } from "@/modules/reporting/infrastructure/ReportDatasetRepository";
import type { ReportDatasetKey } from "@/modules/reporting/domain/ReportDataset";
import { applicationExportTemplate } from "@/modules/reporting/application/bootstrap/ApplicationExportTemplate";
import { reportBootstrapReports } from "@/modules/reporting/application/bootstrap/ReportBootstrapInventory";

const enabled = process.env.RUN_REPORTING_DATABASE_TESTS === "true";
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });

beforeAll(() => {
  if (enabled) {
    vi.mocked(getDatabase).mockReturnValue(
      drizzle(pool) as ReturnType<typeof getDatabase>,
    );
  }
});
afterAll(async () => pool.end());

(enabled ? describe : describe.skip)("report description migration", () => {
  it("backfills documented and custom records, preserves edits on rerun and enforces descriptions", async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      // Temporary legacy-shaped tables isolate migration coverage from other
      // suites and ensure no application or published definition is changed.
      await client.query(`
        CREATE TEMP TABLE app_reporting_datasets (
          key text, version integer, name text, definition jsonb
        );
        CREATE TRIGGER app_reporting_datasets_immutable BEFORE UPDATE OR DELETE
          ON app_reporting_datasets FOR EACH ROW
          EXECUTE FUNCTION public.protect_reporting_dataset_version();
        CREATE TEMP TABLE app_reporting_templates (
          id text, key text, name text, definition jsonb, row_version integer
        );
        CREATE TEMP TABLE app_reporting_reports (
          key text, name text, template_id text, template_version integer, defaults jsonb
        );
      `);
      await client.query(`
        INSERT INTO app_reporting_datasets
          SELECT key, version, name, definition FROM public.app_reporting_datasets;
      `);
      await client.query(
        `
        INSERT INTO app_reporting_templates VALUES
          ('seed', 'application-export', 'Application Data Export', $1::jsonb, 3),
          ('custom', 'custom-export', 'Custom export', $1::jsonb, 4);
        `,
        [JSON.stringify(applicationExportTemplate.definition)],
      );
      await client.query(`
        INSERT INTO app_reporting_reports VALUES
          ('application-data-export', 'Application Data Export', 'seed', 1, '{}'::jsonb),
          ('custom-report', 'Custom report', 'custom', 2, '{}'::jsonb);
      `);
      const migration = await readFile(
        new URL(
          "../../../drizzle/0177_reporting_descriptions.sql",
          import.meta.url,
        ),
        "utf8",
      );
      await client.query(migration);
      const template = (
        await client.query(
          "SELECT * FROM app_reporting_templates WHERE id = 'seed'",
        )
      ).rows[0];
      expect(template.description).toBe(applicationExportTemplate.description);
      expect(template.definition).toEqual(applicationExportTemplate.definition);
      expect(template.row_version).toBe(3);
      expect(
        (
          await client.query(
            "SELECT description FROM app_reporting_reports WHERE key = 'application-data-export'",
          )
        ).rows[0].description,
      ).toBe(
        reportBootstrapReports.find(
          (report) => report.key === "application-data-export",
        )!.description,
      );
      expect(
        (
          await client.query(
            "SELECT description FROM app_reporting_templates WHERE id = 'custom'",
          )
        ).rows[0].description,
      ).toBe("Custom export SQL template for the Application Data dataset.");
      expect(
        (
          await client.query(
            "SELECT description FROM app_reporting_reports WHERE key = 'custom-report'",
          )
        ).rows[0].description,
      ).toBe("Custom report: uses the Custom export template (version 2).");
      await client.query(`
        UPDATE app_reporting_templates SET description = 'Administrator description.' WHERE id = 'seed';
        UPDATE app_reporting_reports SET description = 'Administrator report description.' WHERE key = 'application-data-export';
      `);
      await client.query(migration);
      expect(
        (
          await client.query(
            "SELECT description FROM app_reporting_templates WHERE id = 'seed'",
          )
        ).rows[0].description,
      ).toBe("Administrator description.");
      expect(
        (
          await client.query(
            "SELECT description FROM app_reporting_reports WHERE key = 'application-data-export'",
          )
        ).rows[0].description,
      ).toBe("Administrator report description.");
      for (const table of ["datasets", "templates", "reports"]) {
        for (const description of [null, " \n\t ", "x".repeat(2001)]) {
          await client.query("SAVEPOINT invalid_description");
          await expect(
            client.query(
              `
            INSERT INTO app_reporting_${table} (description) VALUES ($1)
          `,
              [description],
            ),
          ).rejects.toThrow();
          await client.query("ROLLBACK TO SAVEPOINT invalid_description");
        }
      }
      await client.query("SAVEPOINT immutable_dataset");
      await expect(
        client.query(`
        UPDATE app_reporting_datasets SET description = 'Edited dataset';
      `),
      ).rejects.toThrow("immutable");
      await client.query("ROLLBACK TO SAVEPOINT immutable_dataset");
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });
  it("installs three immutable datasets with actual typed view metadata", async () => {
    const datasets = await Promise.all(
      ["application-data", "website-analytics", "workflow-operations"].map(
        (key) => findReportDataset(key as ReportDatasetKey, 1),
      ),
    );
    expect(datasets.every((item) => item?.version === 1)).toBe(true);
    expect(datasets.every((item) => Boolean(item?.description.trim()))).toBe(
      true,
    );
    expect(datasets[0]?.definition.relations[0].columns).toContainEqual(
      expect.objectContaining({
        name: "requested_grant_amount",
        type: "numeric",
      }),
    );
    await expect(
      pool.query(
        "UPDATE app_reporting_datasets SET name = 'Changed' WHERE key = 'application-data'",
      ),
    ).rejects.toThrow("immutable");
  });
});
