import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  process.cwd(),
  "drizzle/0129_workflow_deferral_escalation.sql",
);

describe("workflow deferral and escalation migration", () => {
  it("creates durable records with one active control per source", async () => {
    const migration = await readFile(migrationPath, "utf8");

    expect(migration).toContain('CREATE TABLE "app_workflow_deferrals"');
    expect(migration).toContain('CREATE TABLE "app_workflow_escalations"');
    expect(migration).toContain('"app_workflow_deferrals_active_stage_unique"');
    expect(migration).toContain('"app_workflow_escalations_active_task_unique"');
    expect(migration).toContain('"resolution_action_execution_id" uuid');
  });

  it("normalizes continuation and responsibility configuration", async () => {
    const migration = await readFile(migrationPath, "utf8");

    expect(migration).toContain("'RESUME_ON_DATE'");
    expect(migration).toContain("'EXPLICIT_TRANSFER'");
    expect(migration).toContain("'blockUntilResolved'");
    expect(migration).toContain("'responsibility'");
    expect(migration).toContain("'RESUME', 'Resume', 'RESUME'");
    expect(migration).toContain(
      'DROP CONSTRAINT "app_workflow_actions_type_check"',
    );
    expect(migration.indexOf("'RESUME'\n    )")).toBeLessThan(
      migration.indexOf("'RESUME', 'Resume', 'RESUME'"),
    );
  });
});
