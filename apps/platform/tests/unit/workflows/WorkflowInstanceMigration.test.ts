import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.resolve(process.cwd(), "drizzle/0056_workflow_instance.sql"),
  "utf8",
);

describe("workflow instance migration", () => {
  it("stores the exact workflow template version and required timestamps", () => {
    expect(migration).toContain(
      'RENAME COLUMN "workflow_version_id" TO "workflow_template_version_id"',
    );
    expect(migration).toContain(
      'RENAME COLUMN "ended_at" TO "completed_at"',
    );
    expect(migration).toContain(
      'ADD COLUMN "created_at" timestamp with time zone',
    );
    expect(migration).toContain('SET "created_at" = "started_at"');
  });

  it("keeps the application and template version pin immutable", () => {
    expect(migration).toContain(
      'NEW."application_id" IS DISTINCT FROM OLD."application_id"',
    );
    expect(migration).toContain(
      'NEW."workflow_template_version_id" IS DISTINCT FROM OLD."workflow_template_version_id"',
    );
    expect(migration).toContain(
      "workflow instance version pin is immutable",
    );
  });
});
