import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/platform/database/client", () => ({ getDatabase: vi.fn() }));
vi.mock("@/platform/database/reporting-pool", () => ({ getReportingPool: vi.fn() }));
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { getDatabase } from "@/platform/database/client";
import { getReportingPool } from "@/platform/database/reporting-pool";
import { findReportDataset } from "@/modules/reporting/infrastructure/ReportDatasetRepository";
import {
  executeReportQuery,
  type ReportQueryScope,
} from "@/modules/reporting/infrastructure/ReportQueryRepository";
import {
  installReportingProjectionFixture,
  installReportingPauseFixture,
  installReportingLaterDecision,
  reportProjectionIds as extra,
  withReportingFixtureTransaction,
} from "../../support/ReportingProjectionDatabaseFixture";
import { formContextIds as id } from "../../support/WorkflowEligibilityFormContextFixture";

const enabled = process.env.RUN_REPORTING_DATABASE_TESTS === "true";
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
const scope: ReportQueryScope = {
  actorId: id.actor,
  datasetKey: "application-data",
  runAt: "2026-10-08T12:00:00Z",
  timezone: "Africa/Windhoek",
};
beforeAll(async () => {
  if (!enabled) return;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await installReportingProjectionFixture(client);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  vi.mocked(getDatabase).mockReturnValue(drizzle(pool) as ReturnType<typeof getDatabase>);
  vi.mocked(getReportingPool).mockReturnValue(pool);
});
afterAll(() => pool.end());

async function run(
  datasetKey: ReportQueryScope["datasetKey"],
  sql: string,
  columns: { name: string; type: "text" | "numeric" | "integer" | "uuid" }[],
) {
  const dataset = (await findReportDataset(datasetKey, 1))!;
  const rows: unknown[][] = [];
  await executeReportQuery({
    dataset,
    sql,
    values: [],
    columns,
    scope: { ...scope, datasetKey },
    onBatch: async (batch) => {
      rows.push(...batch);
    },
  });
  return rows;
}

(enabled ? describe : describe.skip)("versioned reporting projections in PostgreSQL 16", () => {
  it.each([
    { outcome: "APPROVED", amount: null, missing: 1 },
    { outcome: "REJECTED", amount: "0.00", missing: 0 },
  ])("uses the latest decision and exposes missing amounts: $outcome", async (expected) => {
    await withReportingFixtureTransaction(pool, async (client) => {
      await installReportingLaterDecision(client, expected.outcome);
      await client.query("SET LOCAL ROLE app_reporting_reader");
      const result = await client.query(
        `SELECT effective_committed_amount, missing_amounts
         FROM app_reporting_dataset_call_commitments_v1 WHERE funding_call_id = $1`,
        [id.call],
      );
      expect(result.rows).toEqual([
        { effective_committed_amount: expected.amount, missing_amounts: expected.missing },
      ]);
    });
  });
  it("merges overlapping stage/task pauses without double counting and adjusts task deadlines", async () => {
    await withReportingFixtureTransaction(pool, async (client) => {
      await installReportingPauseFixture(client);
      await client.query("SET LOCAL ROLE app_reporting_reader");
      const result = await client.query(
        `SELECT gross_elapsed_hours, paused_hours, active_elapsed_hours,
          effective_due_at = '2026-10-03T12:00:00Z'::timestamptz AS adjusted
         FROM app_reporting_dataset_workflow_tasks_v1 WHERE task_id = $1`,
        [id.boundTask],
      );
      expect(result.rows).toHaveLength(1);
      const row = result.rows[0];
      expect([
        Number(row.gross_elapsed_hours),
        Number(row.paused_hours),
        Number(row.active_elapsed_hours),
        row.adjusted,
      ]).toEqual([84, 36, 48, true]);
    });
  });
  it("keeps missing website sources visible, zero distinct from NULL and exact property scope", async () => {
    await withReportingFixtureTransaction(pool, async (client) => {
      const key = crypto.randomUUID();
      await client.query(
        `INSERT INTO app_reporting_website_queries
          (query_key, property_id, timezone, collection_start, contract_version, start_date, end_date, include_panels, failures)
         VALUES ($1, '123', 'Africa/Windhoek', '2026-01-01', 'd1-v2', '2026-10-01', '2026-10-06', true, '{"applicationReach":"unavailable"}'),
          ($1 || '-other', '456', 'Africa/Windhoek', '2026-01-01', 'd1-v2', '2026-10-01', '2026-10-06', true, '{}')`,
        [key],
      );
      await client.query(
        `INSERT INTO app_reporting_website_source_snapshots(query_key, source_name, state, data, fetched_at)
         VALUES ($1, 'traffic', 'ready', '{"visitors":0,"pageViews":0}', now()),
          ($1, 'geography', 'ready', '{"regions":[{"canonicalRegion":"Khomas","users":1,"share":0.25}]}', now())`,
        [key],
      );
      await client.query(
        `SELECT set_config('app.reporting_dataset', 'website-analytics', true),
          set_config('app.reporting_property', '123', true), set_config('app.reporting_timezone', 'Africa/Windhoek', true),
          set_config('app.reporting_collection_start', '2026-01-01', true),
          set_config('app.reporting_start_date', '2026-10-01', true), set_config('app.reporting_end_date', '2026-10-06', true)`,
      );
      await client.query("SET LOCAL ROLE app_reporting_reader");
      const rows = (
        await client.query(
          "SELECT query_key, section, metric, numeric_value, unit, source_state FROM app_reporting_dataset_website_metrics_v1",
        )
      ).rows;
      expect(rows.every((row) => row.query_key === key)).toBe(true);
      expect(rows).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            metric: "visitors",
            numeric_value: "0",
            source_state: "ready",
          }),
          expect.objectContaining({
            section: "applicationReach",
            numeric_value: null,
            source_state: "failure",
          }),
          expect.objectContaining({
            section: "starterCompletion",
            numeric_value: null,
            source_state: "unavailable",
          }),
          expect.objectContaining({ metric: "share", numeric_value: "0.25", unit: "ratio" }),
        ]),
      );
    });
  });
});

(enabled ? describe : describe.skip)("reporting snapshot and execution contracts", () => {
  it("keeps one application row and submitted values despite repeated groups and draft changes", async () => {
    const rows = await run(
      "application-data",
      "SELECT business_name, project_title, requested_grant_amount FROM app_reporting_dataset_applications_v1",
      [
        { name: "business_name", type: "text" },
        { name: "project_title", type: "text" },
        { name: "requested_grant_amount", type: "numeric" },
      ],
    );
    expect(rows).toEqual([["Submitted business", "Submitted project", "9999999999999999.99"]]);
  });
  it("retains one task per exact stage/form version and the recorded completing actor", async () => {
    const rows = await run(
      "workflow-operations",
      "SELECT task_id, assigned_user_id, completing_user_id FROM app_reporting_dataset_workflow_tasks_v1 ORDER BY task_id",
      [
        { name: "task_id", type: "uuid" },
        { name: "assigned_user_id", type: "uuid" },
        { name: "completing_user_id", type: "uuid" },
      ],
    );
    expect(rows).toHaveLength(4);
    expect(rows.find((row) => row[0] === id.boundTask)).toEqual([
      id.boundTask,
      id.otherActor,
      id.actor,
    ]);
  });
  it("counts terminal-approved awards once, preserves exact precision and excludes withdrawn applications", async () => {
    const sql =
      "SELECT effective_committed_amount, missing_amounts FROM app_reporting_dataset_call_commitments_v1 WHERE funding_call_id = '" +
      id.call +
      "'::uuid";
    const columns = [
      { name: "effective_committed_amount", type: "numeric" as const },
      { name: "missing_amounts", type: "integer" as const },
    ];
    expect(await run("workflow-operations", sql, columns)).toEqual([["12345.67", 0]]);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "UPDATE app_applications SET status = 'withdrawn', withdrawn_at = now(), row_version = row_version + 1 WHERE id = $1",
        [id.application],
      );
      await client.query(
        "SELECT set_config('app.reporting_actor', $1, true), set_config('app.reporting_dataset', 'workflow-operations', true), set_config('app.reporting_run_at', $2, true)",
        [id.actor, scope.runAt],
      );
      await client.query("SET LOCAL ROLE app_reporting_reader");
      expect((await client.query(sql)).rows).toEqual([
        { effective_committed_amount: "0.00", missing_amounts: 0 },
      ]);
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });
  it("fails on result type mismatch and preserves zero-row result metadata", async () => {
    await expect(
      run("application-data", "SELECT reference FROM app_reporting_dataset_applications_v1", [
        { name: "reference", type: "numeric" },
      ]),
    ).rejects.toThrow("types");
    expect(
      await run(
        "application-data",
        "SELECT reference FROM app_reporting_dataset_applications_v1 WHERE false",
        [{ name: "reference", type: "text" }],
      ),
    ).toEqual([]);
  });
  it("revalidates current grants rather than trusting the service's captured actor", async () => {
    await pool.query(
      "DELETE FROM app_role_capabilities WHERE role_id = $1 AND capability_id = (SELECT id FROM app_capabilities WHERE code = 'funding.application.all.read')",
      [extra.role],
    );
    try {
      await expect(
        run("application-data", "SELECT reference FROM app_reporting_dataset_applications_v1", [
          { name: "reference", type: "text" },
        ]),
      ).rejects.toThrow("no longer");
    } finally {
      await pool.query(
        "INSERT INTO app_role_capabilities SELECT $1, id FROM app_capabilities WHERE code = 'funding.application.all.read'",
        [extra.role],
      );
    }
  });
  it("enforces database privileges and dataset context even outside the AST validator", async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN READ ONLY");
      await client.query("SET LOCAL ROLE app_reporting_reader");
      await client.query(
        "SELECT set_config('app.reporting_actor', $1, true), set_config('app.reporting_dataset', 'website-analytics', true)",
        [id.actor],
      );
      expect(
        (await client.query("SELECT reference FROM app_reporting_dataset_applications_v1")).rows,
      ).toEqual([]);
      await expect(client.query("SELECT email FROM app_users")).rejects.toThrow(
        "permission denied",
      );
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });
});
