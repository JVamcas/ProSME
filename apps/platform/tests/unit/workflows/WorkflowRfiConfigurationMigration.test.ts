import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.resolve(
    process.cwd(),
    "drizzle/0118_normalize_legacy_rfi_action_configuration.sql",
  ),
  "utf8",
);

describe("legacy request-information configuration migration", () => {
  it("updates only legacy request-information actions", () => {
    expect(migration).toContain("action.action_type = 'REQUEST_INFORMATION'");
    expect(migration).toContain("action.configuration ? 'editableFieldKeys'");
    expect(migration).toContain("NOT action.configuration ?& ARRAY[");
  });

  it("replaces the legacy field name and supplies the full RFI contract", () => {
    expect(migration).toContain("action.configuration->'editableFieldKeys'");
    expect(migration).toContain("'editableFieldPaths'");
    expect(migration).toContain("'continuation', 'RESUME_SOURCE_TASK'");
    expect(migration).toContain(
      "'participantScope', 'APPLICATION_OWNER_AND_REQUESTER'",
    );
    expect(migration).toContain("'recipientScope', 'APPLICATION_OWNER'");
  });

  it("temporarily bypasses and restores published-workflow immutability", () => {
    expect(migration).toContain(
      "DISABLE TRIGGER app_workflow_actions_immutable",
    );
    expect(migration).toContain(
      "ENABLE TRIGGER app_workflow_actions_immutable",
    );
  });
});
