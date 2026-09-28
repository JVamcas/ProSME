import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  process.cwd(),
  "drizzle/0128_workflow_rework_referral_hold.sql",
);

describe("workflow rework, referral and hold migration", () => {
  it("persists immutable semantic records and prevents overlapping work", async () => {
    const migration = await readFile(migrationPath, "utf8");

    expect(migration).toContain('CREATE TABLE "app_workflow_reworks"');
    expect(migration).toContain('CREATE TABLE "app_workflow_referrals"');
    expect(migration).toContain('CREATE TABLE "app_workflow_holds"');
    expect(migration).toContain(
      '"app_workflow_referrals_active_source_unique"',
    );
    expect(migration).toContain('"app_workflow_holds_active_stage_unique"');
  });

  it("adds Resume and normalizes published action configuration", async () => {
    const migration = await readFile(migrationPath, "utf8");

    expect(migration).toContain("'RESUME', 'Resume', 'RESUME'");
    expect(migration).toContain('"sourceTaskBehavior":"BLOCKED"');
    expect(migration).toContain('"scope":"STAGE"');
    expect(migration).toContain("SET repeatable = true");
  });
});
