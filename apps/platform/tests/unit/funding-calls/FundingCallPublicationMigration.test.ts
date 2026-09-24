import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.resolve(process.cwd(), "drizzle/0070_funding_call_publication.sql"),
  "utf8",
);

describe("funding call publication migration", () => {
  it("stores one traceable initial public revision", () => {
    expect(migration).toContain(
      'CREATE TABLE "app_funding_call_publication_revisions"',
    );
    expect(migration).toContain('"source_row_version" integer NOT NULL');
    expect(migration).toContain('"snapshot" jsonb NOT NULL');
    expect(migration).toContain('"lifecycle_history_id" uuid NOT NULL');
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "app_funding_call_publication_revision_unique"',
    );
  });

  it("makes captured public revisions immutable", () => {
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION protect_funding_call_publication_revision()",
    );
    expect(migration).toContain(
      "BEFORE UPDATE OR DELETE ON \"app_funding_call_publication_revisions\"",
    );
  });
});

