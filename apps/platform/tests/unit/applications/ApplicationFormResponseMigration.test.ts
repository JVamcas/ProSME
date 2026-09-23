import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.resolve(process.cwd(), "drizzle/0084_application_draft_autosave.sql"),
  "utf8",
);

describe("application draft persistence migration", () => {
  it("creates version-bound responses and idempotent command storage", () => {
    expect(migration).toContain("app_application_draft_responses");
    expect(migration).toContain("app_application_commands_actor_key_unique");
    expect(migration).toContain("app_applications_latest_draft_response_fk");
    expect(migration).toContain("SAVE_DRAFT_RESPONSE");
  });

  it("creates application audit metadata without a form-values column", () => {
    const auditTable = migration.slice(
      migration.indexOf('CREATE TABLE "app_application_audit_entries"'),
    );
    expect(auditTable).toContain('"metadata" jsonb');
    expect(auditTable).not.toContain('"values" jsonb');
  });
});
