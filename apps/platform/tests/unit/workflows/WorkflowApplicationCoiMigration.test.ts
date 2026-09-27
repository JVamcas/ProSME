import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.resolve(process.cwd(), "drizzle/0111_application_reviewer_coi.sql"),
  "utf8",
);

describe("application reviewer COI migration", () => {
  it("stores one clearance per application and reviewer", () => {
    expect(migration).toContain("CREATE TABLE app_workflow_application_coi");
    expect(migration).toContain("PRIMARY KEY (application_id, user_id)");
    expect(migration).toContain(
      "clearance.application_id = workflow.application_id",
    );
  });

  it("preserves task context in the declaration and event history", () => {
    expect(migration).toContain(
      "task_id uuid NOT NULL REFERENCES app_workflow_tasks(id)",
    );
    expect(migration).toContain(
      "CREATE TABLE app_workflow_application_coi_events",
    );
  });

  it("migrates existing task declarations conservatively", () => {
    expect(migration).toContain(
      "PARTITION BY workflow.application_id, clearance.user_id",
    );
    expect(migration).toContain("WHEN 'REVOKED' THEN 5");
    expect(migration).toContain("WHEN 'RECUSED' THEN 4");
  });
});
