import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.resolve(process.cwd(), "drizzle/0069_funding_call_governance.sql"),
  "utf8",
);

describe("funding call governance migration", () => {
  it("stores an immutable configuration reference for every review request", () => {
    expect(migration).toContain('CREATE TABLE "app_funding_call_governance_reviews"');
    expect(migration).toContain('"submitted_row_version" integer NOT NULL');
    expect(migration).toContain('"configuration_snapshot" jsonb NOT NULL');
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "app_funding_call_governance_review_pending_unique"',
    );
  });

  it("configures maker-checker and submitter withdrawal policy", () => {
    expect(migration).toContain('"enforce_maker_checker" boolean DEFAULT true NOT NULL');
    expect(migration).toContain('"allow_submitter_withdrawal" boolean DEFAULT true NOT NULL');
    expect(migration).toContain("'funding.call.submit.all'");
    expect(migration).toContain("'funding.call.approve.all'");
    expect(migration).toContain("'funding.call.return.all'");
    expect(migration).toContain("'funding.call.approval-request.own.withdraw'");
  });

  it("prevents non-draft configuration mutation at the database boundary", () => {
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION protect_funding_call_governed_configuration()",
    );
    expect(migration).toContain(
      "RAISE EXCEPTION 'only draft funding call configuration can be edited'",
    );
  });
});
