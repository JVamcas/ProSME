import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.resolve(
    process.cwd(),
    "drizzle/0059_stage_task_form_responses.sql",
  ),
  "utf8",
);

describe("stage and task form response migration", () => {
  it("uses canonical response and Workflow Task storage names", () => {
    expect(migration).toContain(
      'RENAME TO "app_form_responses"',
    );
    expect(migration).toContain(
      'RENAME COLUMN "task_instance_id" TO "workflow_task_id"',
    );
    expect(migration).not.toContain("CREATE VIEW");
  });

  it("isolates responses by Workflow Task and reviewer", () => {
    expect(migration).toContain(
      '("workflow_task_id", "respondent_user_id")',
    );
    expect(migration).toContain(
      'SET "respondent_user_id" = "created_by"',
    );
    expect(migration).toContain(
      'DROP CONSTRAINT IF EXISTS "app_form_submissions_task_instance_id_key"',
    );
  });

  it("keeps completed responses immutable", () => {
    expect(migration).toContain("app_form_responses_immutable");
    expect(migration).toContain("completed form responses are immutable");
  });
});
