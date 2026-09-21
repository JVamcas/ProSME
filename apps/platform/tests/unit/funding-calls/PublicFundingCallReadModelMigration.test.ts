import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.resolve(
    process.cwd(),
    "drizzle/0055_public_funding_call_read_model.sql",
  ),
  "utf8",
);

describe("public funding-call read-model migration", () => {
  it("stores the eligibility summary and publication state for documents", () => {
    expect(migration).toContain('ADD COLUMN "eligibility_summary" text');
    expect(migration).toContain(
      'CREATE TABLE "app_funding_call_public_documents"',
    );
    expect(migration).toContain('"published_at" timestamp with time zone');
    expect(migration).toContain("CHECK (\"url\" ~ '^(https?://|/)')");
    expect(migration).toContain(
      'REFERENCES "public"."app_funding_calls"("id")',
    );
  });
});
