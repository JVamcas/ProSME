import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.resolve(
    process.cwd(),
    "drizzle/0133_align_funding_call_permissions.sql",
  ),
  "utf8",
);

describe("funding call permission alignment migration", () => {
  it("preserves draft editing as a separate permission", () => {
    expect(migration).toContain("'funding.call.edit-draft'");
    expect(migration).toContain(
      "('funding.call.update', 'funding.call.edit-draft')",
    );
  });

  it("moves submission grants to create and review grants to approve", () => {
    expect(migration).toContain(
      "('funding.call.update', 'funding.call.edit-draft')",
    );
    expect(migration).toContain(
      "('funding.call.submit.all', 'funding.call.create')",
    );
    expect(migration).toContain(
      "('funding.call.return.all', 'funding.call.approve.all')",
    );
  });

  it("removes the superseded permission records after migrating grants", () => {
    expect(migration).toContain("DELETE FROM app_role_capabilities");
    expect(migration).toContain("DELETE FROM app_capabilities");
  });
});
