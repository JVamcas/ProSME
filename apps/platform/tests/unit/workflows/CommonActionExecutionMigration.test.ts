import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.resolve(process.cwd(), "drizzle/0064_common_action_execution.sql"),
  "utf8",
);

describe("common workflow action execution migration", () => {
  it("creates immutable, idempotent action executions", () => {
    expect(migration).toContain("app_workflow_action_executions");
    expect(migration).toContain("idempotency_unique");
    expect(migration).toContain("BEFORE UPDATE OR DELETE");
    expect(migration).toContain("normalized_input");
    expect(migration).toContain("condition_evaluation");
  });

  it("adds the shared stage concurrency token and action conditions", () => {
    expect(migration).toContain('ADD COLUMN "row_version"');
    expect(migration).toContain('ADD COLUMN "condition" jsonb');
    expect(migration).toContain("app_workflow_actions_condition_check");
  });
});
