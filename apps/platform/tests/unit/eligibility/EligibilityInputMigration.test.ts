import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.resolve(process.cwd(), "drizzle/0072_dynamic_eligibility_inputs.sql"),
  "utf8",
);

describe("dynamic eligibility input migration", () => {
  it("stores version-owned inputs and independent mode bindings", () => {
    expect(migration).toContain(
      'CREATE TABLE "app_eligibility_input_definitions"',
    );
    expect(migration).toContain(
      'CREATE TABLE "app_eligibility_self_check_questions"',
    );
    expect(migration).toContain(
      'CREATE TABLE "app_eligibility_screening_source_bindings"',
    );
    expect(migration).toContain('UNIQUE ("version_id", "stable_key")');
  });

  it("protects published inputs and validates sources before publication", () => {
    expect(migration).toContain("require_mutable_eligibility_input");
    expect(migration).toContain(
      "eligibility inputs contain missing or unresolved bindings",
    );
    expect(migration).toContain(
      "PERFORM validate_eligibility_inputs_for_publication(NEW.id)",
    );
    expect(migration).toContain("WHEN 'INTEGRATION_OUTPUT' THEN FALSE");
  });

  it("does not add or seed authorization capabilities", () => {
    expect(migration).not.toContain("app_capabilities");
    expect(migration).not.toContain("app_role_capabilities");
  });
});
