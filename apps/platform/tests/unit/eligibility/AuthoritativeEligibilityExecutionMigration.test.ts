import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.resolve(
    process.cwd(),
    "drizzle/0077_authoritative_eligibility_execution.sql",
  ),
  "utf8",
);

describe("authoritative eligibility execution migration", () => {
  it("supports append-only numbered evaluations bound to workflow tasks", () => {
    expect(migration).toContain('"evaluation_number" integer');
    expect(migration).toContain('"workflow_task_id" uuid');
    expect(migration).toContain(
      '"app_authoritative_eligibility_outcomes_application_number_unique"',
    );
    expect(migration).toContain(
      'REFERENCES "app_workflow_tasks"("id")',
    );
  });

  it("makes command replay idempotent without adding legacy capabilities", () => {
    expect(migration).toContain(
      '"app_authoritative_eligibility_outcomes_command_unique"',
    );
    expect(migration).not.toContain("app_capabilities");
    expect(migration).not.toContain("app_role_capabilities");
  });
});
