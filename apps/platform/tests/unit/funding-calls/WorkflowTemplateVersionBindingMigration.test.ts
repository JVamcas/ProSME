import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.resolve(
    process.cwd(),
    "drizzle/0054_bind_workflow_template_version.sql",
  ),
  "utf8",
);

describe("funding-call workflow template version binding migration", () => {
  it("stores the exact workflow template version on the funding call", () => {
    expect(migration).toContain(
      'ALTER TABLE "app_funding_calls"\n  ADD COLUMN "workflow_template_version_id" uuid',
    );
    expect(migration).toContain(
      'REFERENCES "public"."app_workflow_definition_versions"("id")',
    );
    expect(migration).toContain("ON DELETE restrict");
  });
});
