import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.resolve(
    process.cwd(),
    "drizzle/0074_generic_eligibility_evidence_facts.sql",
  ),
  "utf8",
);

describe("generic Eligibility evidence fact migration", () => {
  it("stores append-only document versions and exact-version reviews", () => {
    expect(migration).toContain(
      'CREATE TABLE "app_workflow_document_evidence_versions"',
    );
    expect(migration).toContain(
      'CREATE TABLE "app_workflow_document_evidence_verifications"',
    );
    expect(migration).toContain(
      'UNIQUE INDEX "app_workflow_document_evidence_version_unique"',
    );
    expect(migration).toContain(
      'UNIQUE INDEX "app_workflow_document_evidence_verification_unique"',
    );
    expect(migration).toContain("reject_evidence_fact_mutation");
  });

  it("accepts only configured document and checklist fact keys", () => {
    expect(migration).toContain("eligibility_source_fact_exists");
    expect(migration).toContain("'response', 'completed'");
    expect(migration).toContain("'expiredAtEvaluation'");
    expect(migration).toContain("'latestAcceptedVersionId'");
  });

  it("does not add legacy capability grants", () => {
    expect(migration).not.toContain("app_capabilities");
    expect(migration).not.toContain("app_role_capabilities");
  });
});
