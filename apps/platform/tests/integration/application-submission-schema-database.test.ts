import pg from "pg";
import { afterAll, describe, expect, it } from "vitest";

const enabled = process.env.RUN_P3_APPLICATION_DATABASE_TESTS === "true";
const describeDatabase = enabled ? describe : describe.skip;
const pool = enabled
  ? new pg.Pool({ connectionString: process.env.DATABASE_URL })
  : null;

async function query(text: string) {
  if (!pool) throw new Error("The application database test pool is not configured.");
  return pool.query(text);
}

afterAll(async () => pool?.end());

describeDatabase("application submission schema", () => {
  it("installs runtime, idempotency, event, and outbox records", async () => {
    const records = await query(
      `SELECT
        to_regclass('app_workflow_instances') AS workflow_instances,
        to_regclass('app_application_submission_commands') AS commands,
        to_regclass('app_application_submission_snapshots') AS snapshots,
        to_regclass('app_transactional_outbox') AS outbox,
        to_regclass('app_applications_reference_unique') AS reference_index`,
    );
    expect(records.rows[0]).toEqual({
      commands: "app_application_submission_commands",
      outbox: "app_transactional_outbox",
      reference_index: "app_applications_reference_unique",
      snapshots: "app_application_submission_snapshots",
      workflow_instances: "app_workflow_instances",
    });
  });
});
