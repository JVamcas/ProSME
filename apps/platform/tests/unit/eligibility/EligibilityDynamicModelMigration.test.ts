import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.resolve(
    process.cwd(),
    "drizzle/0080_eligibility_dynamic_model_migration.sql",
  ),
  "utf8",
);

describe("Eligibility dynamic-model migration", () => {
  it("migrates Draft references without modifying historical versions", () => {
    expect(migration).toContain("migrate_draft_eligibility_configuration");
    expect(migration).toContain("WHERE version.status = 'DRAFT'");
    expect(migration).toContain("rewrite_eligibility_field_references");
    expect(migration).toContain("'eligibility.' || target_stable_key");
    expect(migration).not.toMatch(
      /UPDATE app_eligibility_rule_set_versions[\s\S]+SET status/,
    );
  });

  it("reports unsupported references and blocks publication", () => {
    expect(migration).toContain(
      'CREATE TABLE "app_eligibility_configuration_issues"',
    );
    expect(migration).toContain("'LEGACY_MIGRATION'");
    expect(migration).toContain(
      "PERFORM validate_no_unresolved_eligibility_references(NEW.id)",
    );
    expect(migration).toContain(
      "eligibility rules contain unresolved migrated references",
    );
  });

  it("is rerunnable and adds no legacy authorization grants", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION");
    expect(migration).toContain("ON CONFLICT DO NOTHING");
    expect(migration).not.toContain("app_capabilities");
    expect(migration).not.toContain("app_role_capabilities");
  });
});
