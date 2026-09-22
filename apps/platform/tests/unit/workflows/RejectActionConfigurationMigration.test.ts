import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.resolve(
    process.cwd(),
    "drizzle/0078_backfill_reject_action_configuration.sql",
  ),
  "utf8",
);

describe("reject action configuration migration", () => {
  it("backfills the complete reject configuration contract", () => {
    expect(migration).toContain("'commentRequired', true");
    expect(migration).toContain("'reversibleActionKey', NULL");
    expect(migration).toContain("'cancelOpenStageInstances', true");
    expect(migration).toContain("'cancelOpenTasks', true");
    expect(migration).toContain("'status', 'OUTCOME_AVAILABLE'");
  });

  it("preserves terminal and transition routing semantics", () => {
    expect(migration).toContain("transition.terminal_outcome IS NOT NULL");
    expect(migration).toContain("'type', 'TERMINAL'");
    expect(migration).toContain("'type', 'TRANSITION'");
  });

  it("only updates legacy reject configurations", () => {
    expect(migration).toContain("action.action_type = 'REJECT'");
    expect(migration).toContain("NOT action.configuration ?& ARRAY[");
  });
});
