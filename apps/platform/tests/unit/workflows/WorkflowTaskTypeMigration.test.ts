import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.resolve(process.cwd(), "drizzle/0116_workflow_task_types.sql"),
  "utf8",
);

describe("workflow task type migration", () => {
  it("adds the two explicit task types", () => {
    expect(migration).toContain("'CONTRIBUTING', 'STAGE_DECISION'");
  });

  it("backfills only single-reviewer decision tasks", () => {
    expect(migration).toContain("task.reviewer_count = 1");
    expect(migration).toContain("'APPROVE_ADVANCE'");
    expect(migration).toContain("'REJECT'");
    expect(migration).toContain("PARTITION BY task.stage_id");
    expect(migration).toContain("candidate.candidate_order = 1");
  });
  expect(migration).toContain("DISABLE TRIGGER app_stage_tasks_immutable");
  expect(migration).toContain("ENABLE TRIGGER app_stage_tasks_immutable");

  it("enforces one single-assignee decision task per stage", () => {
    expect(migration).toContain(
      "app_stage_tasks_decision_single_reviewer_check",
    );
    expect(migration).toContain(
      "app_stage_tasks_one_decision_per_stage_unique",
    );
  });
});
