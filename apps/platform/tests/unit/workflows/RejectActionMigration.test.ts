import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.resolve(process.cwd(), "drizzle/0066_reject_action_semantics.sql"),
  "utf8",
);

describe("reject action migration", () => {
  it("persists a rejected workflow state and safe public status separately", () => {
    expect(migration).toContain("'REJECTED'");
    expect(migration).toContain('"terminal_outcome" text');
    expect(migration).toContain('"public_status" jsonb');
    expect(migration).toContain("app_workflow_instances_rejection_check");
  });

  it("allows immutable negative decisions and rejected transitions", () => {
    expect(migration).toContain("'APPROVED', 'REJECTED'");
    expect(migration).toContain("'WORKFLOW_REJECTED'");
    expect(migration).toContain("\"input\"->>'actionType' = 'REJECT'");
  });
});
