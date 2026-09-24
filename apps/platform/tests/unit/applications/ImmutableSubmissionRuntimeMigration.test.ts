import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.resolve(process.cwd(), "drizzle/0087_immutable_submission_runtime.sql"),
  "utf8",
);

describe("immutable submission runtime migration", () => {
  it("stores canonical content, a schema version, and a SHA-256 hash", () => {
    expect(migration).toContain('ADD COLUMN "schema_version" integer');
    expect(migration).toContain('ADD COLUMN "snapshot_content" jsonb');
    expect(migration).toContain('ADD COLUMN "canonical_content" text');
    expect(migration).toContain('ADD COLUMN "integrity_hash" text');
    expect(migration).toContain("digest(convert_to");
    expect(migration).toContain(
      'CHECK ("snapshot_content" = "canonical_content"::jsonb)',
    );
  });

  it("rejects snapshot updates and deletes at the database boundary", () => {
    expect(migration).toContain(
      "CREATE FUNCTION app_reject_submission_snapshot_mutation()",
    );
    expect(migration).toContain(
      'BEFORE UPDATE OR DELETE ON "app_application_submission_snapshots"',
    );
    expect(migration).toContain(
      "application submission snapshots are immutable",
    );
  });

  it("allows audited snapshot access records", () => {
    expect(migration).toContain("'SUBMISSION_SNAPSHOT_ACCESSED'");
  });
});
