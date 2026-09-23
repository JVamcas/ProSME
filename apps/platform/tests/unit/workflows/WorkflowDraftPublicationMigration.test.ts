import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.resolve(
    process.cwd(),
    "drizzle/0082_internal_draft_workflow_publication.sql",
  ),
  "utf8",
);

describe("internal draft workflow publication migration", () => {
  it("allows Draft and Approved versions to transition to Published", () => {
    expect(migration).toContain(
      "OLD.status IN ('DRAFT', 'APPROVED') AND NEW.status = 'PUBLISHED'",
    );
  });

  it("retains publication attribution requirements", () => {
    expect(migration).toContain("NEW.published_by IS NOT NULL");
    expect(migration).toContain("NEW.published_at IS NOT NULL");
    expect(migration).toContain("NEW.row_version <> OLD.row_version + 1");
  });
});
