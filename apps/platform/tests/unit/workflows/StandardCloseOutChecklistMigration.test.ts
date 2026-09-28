import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  process.cwd(),
  "drizzle/0130_remove_standard_closeout_scoring.sql",
);

describe("standard close-out checklist migration", () => {
  it("removes scoring only from the standard close-out task", async () => {
    const migration = await readFile(migrationPath, "utf8");

    expect(migration).toContain("app_workflow_stage_scoring_criteria");
    expect(migration).toContain("app_workflow_stage_scoring_configurations");
    expect(migration).toContain("workflow.code = 'SME_FUND_STANDARD'");
    expect(migration).toContain("stage.code = 'EVALUATION_CLOSE_OUT'");
    expect(migration).not.toContain("app_stage_task_definitions");
  });
});
