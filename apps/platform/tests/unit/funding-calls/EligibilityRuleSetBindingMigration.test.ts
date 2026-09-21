import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.resolve(
    process.cwd(),
    "drizzle/0053_bind_eligibility_ruleset_version.sql",
  ),
  "utf8",
);

describe("funding-call eligibility ruleset binding migration", () => {
  it("stores exact ruleset versions on funding calls and applications", () => {
    expect(migration).toContain(
      'ALTER TABLE "app_funding_calls"\n  ADD COLUMN "eligibility_rule_set_version_id" uuid',
    );
    expect(migration).toContain(
      'ALTER TABLE "app_applications"\n  ADD COLUMN "eligibility_rule_set_version_id" uuid',
    );
    expect(migration).toContain(
      'REFERENCES "public"."app_eligibility_rule_set_versions"("id")',
    );
    expect(migration).toContain("ON DELETE restrict");
  });
});
