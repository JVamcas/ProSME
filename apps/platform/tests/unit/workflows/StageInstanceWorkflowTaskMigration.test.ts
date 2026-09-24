import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.resolve(
    process.cwd(),
    "drizzle/0057_stage_instance_and_workflow_task.sql",
  ),
  "utf8",
);

describe("stage instance and workflow task migration", () => {
  it("stores repeatable stage iterations and runtime context", () => {
    expect(migration).toContain('ADD COLUMN "iteration_number" integer');
    expect(migration).toContain('ADD COLUMN "referral_context" jsonb');
    expect(migration).toContain('ADD COLUMN "return_context" jsonb');
    expect(migration).toContain(
      '"workflow_stage_definition_id",\n    "iteration_number"',
    );
  });

  it("uses canonical runtime task storage without a compatibility view", () => {
    expect(migration).toContain(
      'ALTER TABLE "app_stage_task_instances" RENAME TO "app_workflow_tasks"',
    );
    expect(migration).toContain(
      'RENAME COLUMN "task_definition_id" TO "workflow_task_definition_id"',
    );
    expect(migration).not.toContain("CREATE VIEW");
  });
});
