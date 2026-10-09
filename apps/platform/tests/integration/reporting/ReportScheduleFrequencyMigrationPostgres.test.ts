import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/platform/database/client", () => ({ getDatabase: vi.fn() }));
vi.mock("@/platform/database/reporting-pool", () => ({
  getReportingPool: vi.fn(),
}));

import type { AuthenticatedUser } from "@/auth/types";
import { runReport } from "@/modules/reporting/ServerReportService";
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
});

(enabled ? describe : describe.skip)("day-frequency migration", () => {
  it("converts existing rules once, aligns counting to anchors and preserves pending run history", async () => {
    const report = await createAutomationReport(actor);
    const pending = await runReport(actor, report.id, {
      idempotencyKey: crypto.randomUUID(),
      values: {},
    });
    const migration = await readFile(
      new URL(
        "../../../drizzle/0182_reporting_day_frequency.sql",
        import.meta.url,
      ),
      "utf8",
    );
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const original = await client.query(
        "SELECT values, definition, period FROM app_reporting_report_runs WHERE id = $1",
        [pending.id],
      );
      // Restore the pre-migration schedule shape inside a rollback-only fixture.
      await client.query(`
        ALTER TABLE app_reporting_report_schedules DROP COLUMN frequency_days;
        ALTER TABLE app_reporting_report_schedules ADD COLUMN cadence text NOT NULL;
        ALTER TABLE app_reporting_report_schedules ADD COLUMN finalization_hours integer NOT NULL;
      `);
      await client.query(
        `
        INSERT INTO app_reporting_report_schedules(report_id, cadence, timezone,
          anchor, send_time, finalization_hours, enabled, cursor, next_due_at,
          pending_run_id, lease_token, lease_until)
        SELECT $1, cadence, 'Africa/Windhoek', '2026-10-01', '09:00', 48,
          true, cursor::date, '2026-12-03T07:00:00Z', $2, gen_random_uuid(), now() + interval '1 hour'
        FROM (VALUES ('FOURTEEN_DAYS', '2026-10-15'), ('MONTHLY', '2026-11-01')) fixture(cadence, cursor)
      `,
        [report.id, pending.id],
      );
      await client.query(migration);
      const selection = `SELECT frequency_days, anchor::text, cursor::text, enabled,
        row_version, pending_run_id, lease_token, lease_until,
        to_char(next_due_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS') AS due
        FROM app_reporting_report_schedules ORDER BY frequency_days`;
      const converted = (await client.query(selection)).rows;
      expect(converted).toEqual([
        {
          frequency_days: 14,
          anchor: "2026-10-01",
          cursor: "2026-10-15",
          enabled: true,
          row_version: 2,
          pending_run_id: pending.id,
          lease_token: null,
          lease_until: null,
          due: "2026-10-29T07:00:00",
        },
        {
          frequency_days: 30,
          anchor: "2026-10-01",
          cursor: "2026-10-31",
          enabled: true,
          row_version: 2,
          pending_run_id: pending.id,
          lease_token: null,
          lease_until: null,
          due: "2026-11-30T07:00:00",
        },
      ]);
      await client.query(migration);
      expect((await client.query(selection)).rows).toEqual(converted);
      const run = await client.query(
        "SELECT values, definition, period FROM app_reporting_report_runs WHERE id = $1",
        [pending.id],
      );
      expect(run.rows).toEqual(original.rows);
      await expect(
        client.query(
          "UPDATE app_reporting_report_schedules SET frequency_days = 0",
        ),
      ).rejects.toMatchObject({ code: "23514" });
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });
});
