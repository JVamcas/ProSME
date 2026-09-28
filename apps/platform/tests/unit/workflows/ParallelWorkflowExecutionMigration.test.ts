import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.resolve(process.cwd(), "drizzle/0126_parallel_workflow_execution.sql"),
  "utf8",
);

describe("parallel workflow execution migration", () => {
  it("normalizes transition targets and preserves existing targets", () => {
    expect(migration).toContain('CREATE TABLE "app_workflow_transition_targets"');
    expect(migration).toContain('SELECT "id", "to_stage_id"');
    expect(migration).toContain('DROP COLUMN "to_stage_id"');
  });

  it("stores declarative joins and per-target execution outcomes", () => {
    expect(migration).toContain(
      'CREATE TABLE "app_workflow_stage_join_predecessors"',
    );
    expect(migration).toContain(
      'CREATE TABLE "app_workflow_transition_execution_targets"',
    );
    expect(migration).toContain("'JOIN_PENDING'");
    expect(migration).not.toContain("CREATE VIEW");
  });

  it("enforces version ownership and published-definition immutability", () => {
    expect(migration).toContain(
      "prevent_immutable_workflow_parallel_definition_mutation",
    );
    expect(migration).toContain(
      "parallel workflow references must belong to one version",
    );
    expect(migration).toContain("require_mutable_workflow_version");
  });
});
