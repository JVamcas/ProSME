import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.resolve(
    process.cwd(),
    "drizzle/0075_mode_specific_eligibility_resolution.sql",
  ),
  "utf8",
);

describe("mode-specific Eligibility resolution migration", () => {
  it("persists authoritative evaluated-value provenance", () => {
    expect(migration).toContain('"evaluated_value_provenance" jsonb');
    expect(migration).toContain("DEFAULT '{}'::jsonb NOT NULL");
  });

  it("does not add legacy capability grants", () => {
    expect(migration).not.toContain("app_capabilities");
    expect(migration).not.toContain("app_role_capabilities");
  });
});
