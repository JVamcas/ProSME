import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.resolve(
    process.cwd(),
    "drizzle/0079_configurable_eligibility_integration_outputs.sql",
  ),
  "utf8",
);

describe("configurable eligibility integration migration", () => {
  it("stores definitions, versions, exact bindings and append-only results", () => {
    expect(migration).toContain(
      'CREATE TABLE "app_eligibility_integration_definitions"',
    );
    expect(migration).toContain(
      'CREATE TABLE "app_eligibility_integration_versions"',
    );
    expect(migration).toContain(
      'CREATE TABLE "app_funding_call_eligibility_integration_bindings"',
    );
    expect(migration).toContain(
      'CREATE TABLE "app_eligibility_integration_executions"',
    );
    expect(migration).toContain('"workflow_template_version_id" uuid NOT NULL');
  });

  it("distinguishes runtime outcomes and protects published configuration", () => {
    expect(migration).toContain(
      "'SUCCEEDED', 'NEGATIVE', 'UNAVAILABLE', 'TIMED_OUT'",
    );
    expect(migration).toContain(
      "prevent_published_eligibility_integration_change",
    );
    expect(migration).toContain('"manual_fallback_allowed" boolean');
    expect(migration).toContain('"raw_response_expires_at"');
  });

  it("adds only canonical E9 permission codes", () => {
    expect(migration).toContain("'integration.eligibility.manual-verify'");
    expect(migration).not.toContain("capabilities.ts");
  });
});
