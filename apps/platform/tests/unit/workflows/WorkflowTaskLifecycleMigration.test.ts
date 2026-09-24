import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.resolve(process.cwd(), "drizzle/0058_workflow_task_lifecycle.sql"),
  "utf8",
);

describe("workflow task lifecycle migration", () => {
  it("normalizes legacy states and enforces the five-state model", () => {
    expect(migration).toContain("WHEN 'READY' THEN 'PENDING'");
    expect(migration).toContain("WHEN 'BLOCKED' THEN 'IN_PROGRESS'");
    expect(migration).toContain("WHEN 'SKIPPED' THEN 'CANCELLED'");
    expect(migration).toContain(
      "'PENDING', 'CLAIMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'",
    );
    expect(migration).toContain("ALTER COLUMN \"status\" SET DEFAULT 'PENDING'");
  });

  it("seeds the canonical all-task cancellation permission", () => {
    expect(migration).toContain("'workflow.task.cancel.all'");
  });
});
