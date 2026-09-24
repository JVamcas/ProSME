import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.resolve(process.cwd(), "drizzle/0065_approve_advance_decisions.sql"),
  "utf8",
);

describe("approve and advance decision migration", () => {
  it("creates an immutable positive decision linked to its exact action", () => {
    expect(migration).toContain('CREATE TABLE "app_workflow_decisions"');
    expect(migration).toContain('"action_execution_id" uuid NOT NULL');
    expect(migration).toContain('"action_definition_id" uuid NOT NULL');
    expect(migration).toContain("'APPROVE_ADVANCE'");
    expect(migration).toContain("BEFORE UPDATE OR DELETE");
  });

  it("prevents a retried execution from creating a second decision", () => {
    expect(migration).toContain("app_workflow_decisions_execution_unique");
  });
});
