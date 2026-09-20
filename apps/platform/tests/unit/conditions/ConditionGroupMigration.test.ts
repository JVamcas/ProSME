import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.resolve(process.cwd(), "drizzle/0036_condition_groups.sql"),
  "utf8",
);

describe("condition group migration", () => {
  it("stores complete condition group documents as JSONB", () => {
    expect(migration).toContain('CREATE TABLE "app_condition_groups"');
    expect(migration).toContain('"definition" jsonb NOT NULL');
    expect(migration).toContain("jsonb_typeof(\"definition\") = 'object'");
    expect(migration).toContain("\"definition\"->>'kind' = 'GROUP'");
    expect(migration).toContain("\"definition\"->>'id' = \"id\"::text");
    expect(migration).toContain(") IS TRUE");
  });
});
