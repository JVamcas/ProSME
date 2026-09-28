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

const definitionBackfill = readFileSync(
  path.resolve(
    process.cwd(),
    "drizzle/0125_backfill_default_common_workflow_actions.sql",
  ),
  "utf8",
);

const enablementMigration = readFileSync(
  path.resolve(
    process.cwd(),
    "drizzle/0127_enable_default_common_workflow_actions.sql",
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

describe("default common-action definition backfill", () => {
  it("creates every missing default and binds it to existing tasks", () => {
    expect(definitionBackfill).toContain("'REQUEST_INFORMATION'::text");
    expect(definitionBackfill).toContain("'REFER'");
    expect(definitionBackfill).toContain("'PUT_ON_HOLD'");
    expect(definitionBackfill).toContain("'ESCALATE'");
    expect(definitionBackfill).toContain(
      "JOIN app_stage_task_definitions task",
    );
  });

  it("preserves published-version immutability after the backfill", () => {
    expect(definitionBackfill).toContain(
      "DISABLE TRIGGER app_workflow_actions_immutable",
    );
    expect(definitionBackfill).toContain(
      "ENABLE TRIGGER app_workflow_actions_immutable",
    );
  });

  it("is repeatable and does not overwrite existing action configuration", () => {
    expect(definitionBackfill).toContain("AND NOT EXISTS");
    expect(definitionBackfill).toContain(
      "ON CONFLICT (stage_id, stable_key) DO NOTHING",
    );
    expect(definitionBackfill).toContain(
      "ON CONFLICT (task_definition_id, action_key) DO NOTHING",
    );
  });
});

describe("default common-action enablement migration", () => {
  it("enables each canonical common action for existing workflows", () => {
    expect(enablementMigration).toContain("SET enabled = true");
    expect(enablementMigration).toContain("'REQUEST_INFORMATION'");
    expect(enablementMigration).toContain("'REFER'");
    expect(enablementMigration).toContain("'PUT_ON_HOLD'");
    expect(enablementMigration).toContain("'ESCALATE'");
  });

  it("preserves published-version immutability after the update", () => {
    expect(enablementMigration).toContain(
      "DISABLE TRIGGER app_workflow_actions_immutable",
    );
    expect(enablementMigration).toContain(
      "ENABLE TRIGGER app_workflow_actions_immutable",
    );
  });
});
