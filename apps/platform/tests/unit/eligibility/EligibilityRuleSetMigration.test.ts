import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.resolve(process.cwd(), "drizzle/0048_eligibility_rulesets.sql"),
  "utf8",
);

describe("eligibility ruleset migration", () => {
  it("stores independently versioned rules and generic condition references", () => {
    expect(migration).toContain('CREATE TABLE "app_eligibility_rule_sets"');
    expect(migration).toContain('CREATE TABLE "app_eligibility_rule_set_versions"');
    expect(migration).toContain('CREATE TABLE "app_eligibility_rules"');
    expect(migration).toContain('REFERENCES "app_condition_groups"("id")');
    expect(migration).toContain('"condition_kind" = \'CONDITION\'');
  });

  it("enforces published-version and referenced-condition immutability", () => {
    expect(migration).toContain(
      "published and retired eligibility ruleset versions are immutable",
    );
    expect(migration).toContain(
      "only draft eligibility ruleset versions are editable",
    );
    expect(migration).toContain(
      "conditions referenced by published eligibility rules are immutable",
    );
  });

  it("seeds only canonical eligibility ruleset permissions", () => {
    for (const action of ["read", "create", "update", "publish", "retire"]) {
      expect(migration).toContain(`eligibility.ruleset.${action}`);
    }
  });
});
