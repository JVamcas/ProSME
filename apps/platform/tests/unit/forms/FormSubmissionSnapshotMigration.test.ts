import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.resolve(process.cwd(), "drizzle/0035_submitted_form_snapshots.sql"),
  "utf8",
);

describe("submitted form snapshot migration", () => {
  it("persists the exact definition and version for completed submissions", () => {
    expect(migration).toContain("ADD COLUMN definition_snapshot jsonb");
    expect(migration).toContain("'versionId', version.id");
    expect(migration).toContain("'fields', COALESCE");
    expect(migration).toContain("'sections', COALESCE");
    expect(migration).toContain("definition_snapshot IS NOT NULL");
    expect(migration).toContain(
      "definition_snapshot->>'versionId' = form_version_id::text",
    );
  });

  it("protects lodged submissions from updates and deletes", () => {
    expect(migration).toContain("app_form_submissions_immutable");
    expect(migration).toContain("BEFORE UPDATE OR DELETE");
    expect(migration).toContain("completed form submissions are immutable");
  });
});
