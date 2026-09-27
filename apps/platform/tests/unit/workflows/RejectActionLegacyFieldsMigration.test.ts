import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.resolve(
    process.cwd(),
    "drizzle/0108_remove_legacy_reject_action_fields.sql",
  ),
  "utf8",
);

const reasonRequirementMigration = readFileSync(
  path.resolve(
    process.cwd(),
    "drizzle/0109_normalize_reject_reason_requirement.sql",
  ),
  "utf8",
);

describe("legacy reject action fields migration", () => {
  it("removes fields that are no longer part of the strict action schema", () => {
    expect(migration).toContain("'commentRequired'");
    expect(migration).toContain("'reasonCodes'");
    expect(migration).toContain("configuration - ARRAY[");
  });

  it("temporarily bypasses and restores published-version immutability", () => {
    expect(migration).toContain(
      "DISABLE TRIGGER app_workflow_actions_immutable",
    );
    expect(migration).toContain(
      "ENABLE TRIGGER app_workflow_actions_immutable",
    );
  });

  it("only changes reject actions that contain legacy fields", () => {
    expect(migration).toContain("action_type = 'REJECT'");
    expect(migration).toContain("configuration ?| ARRAY[");
  });
});

describe("reject reason requirement migration", () => {
  it("normalizes reject actions to the current schema", () => {
    expect(reasonRequirementMigration).toContain(
      "SET reason_code_required = false",
    );
    expect(reasonRequirementMigration).toContain("action_type = 'REJECT'");
    expect(reasonRequirementMigration).toContain(
      "reason_code_required = true",
    );
  });

  it("restores the published-version immutability trigger", () => {
    expect(reasonRequirementMigration).toContain(
      "ENABLE TRIGGER app_workflow_actions_immutable",
    );
  });
});
