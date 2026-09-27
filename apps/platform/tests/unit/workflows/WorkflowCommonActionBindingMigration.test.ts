import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.resolve(
    process.cwd(),
    "drizzle/0120_bind_common_actions_to_existing_tasks.sql",
  ),
  "utf8",
);

describe("existing workflow common-action binding migration", () => {
  it("binds every common action type to every task in its stage", () => {
    expect(migration).toContain("JOIN app_stage_task_definitions task");
    expect(migration).toContain("task.stage_id = action.stage_id");
    expect(migration).toContain("'REQUEST_INFORMATION'");
    expect(migration).toContain("'REFER'");
    expect(migration).toContain("'ESCALATE'");
    expect(migration).toContain("'PUT_ON_HOLD'");
  });

  it("is safe when a binding already exists", () => {
    expect(migration).toContain(
      "ON CONFLICT (task_definition_id, action_key) DO NOTHING",
    );
  });
});
