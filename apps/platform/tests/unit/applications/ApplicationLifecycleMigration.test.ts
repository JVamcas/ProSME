import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.resolve(
    process.cwd(),
    "drizzle/0083_application_domain_lifecycle.sql",
  ),
  "utf8",
);

describe("application lifecycle migration", () => {
  it("persists lifecycle, response, snapshot, and concurrency fields", () => {
    expect(migration).toContain('ADD COLUMN "latest_draft_response_id" uuid');
    expect(migration).toContain('ADD COLUMN "submission_snapshot_id" uuid');
    expect(migration).toContain('ADD COLUMN "withdrawn_at" timestamp');
    expect(migration).toContain('"row_version" > 0');
    expect(migration).toContain("'draft', 'submitted', 'withdrawn'");
  });

  it("links workflow versions only through workflow instances", () => {
    expect(migration).toContain(
      'ALTER TABLE "app_applications" DROP COLUMN "workflow_version_id"',
    );
    expect(migration).toContain(
      'CREATE TABLE "app_application_lifecycle_history"',
    );
  });

  it("enforces each configured duplicate policy with database indexes", () => {
    expect(migration).toContain(
      '"application_duplicate_policy" text',
    );
    expect(migration).toContain(
      '"app_applications_applicant_opportunity_unique"',
    );
    expect(migration).toContain(
      '"duplicate_policy" = \'one_per_business\'',
    );
  });
});
