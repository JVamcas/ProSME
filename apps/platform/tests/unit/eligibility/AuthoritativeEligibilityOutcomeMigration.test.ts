import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../drizzle/0063_authoritative_eligibility_outcomes.sql", import.meta.url),
  "utf8",
);

describe("authoritative eligibility outcome migration", () => {
  it("stores one immutable, version-bound outcome per Application", () => {
    expect(migration).toContain(
      'CREATE TABLE "app_authoritative_eligibility_outcomes"',
    );
    expect(migration).toContain(
      'REFERENCES "public"."app_eligibility_rule_set_versions"("id")',
    );
    expect(migration).toContain(
      '"app_authoritative_eligibility_outcomes_application_unique"',
    );
    expect(migration).toContain('"evaluated_at" timestamp with time zone');
    expect(migration).toContain('"rule_outcomes" jsonb NOT NULL');
    expect(migration).toContain('"evaluated_values" jsonb NOT NULL');
    expect(migration).toContain(
      'BEFORE UPDATE OR DELETE ON "app_authoritative_eligibility_outcomes"',
    );
  });
});
