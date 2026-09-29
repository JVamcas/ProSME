import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = fs.readFileSync(
  path.resolve(process.cwd(), "drizzle/0138_funding_call_creation_autosave.sql"),
  "utf8",
);

describe("funding-call creation autosave migration", () => {
  it("creates one owner-scoped, versioned draft workspace per user", () => {
    expect(migration).toContain("app_funding_call_creation_progress");
    expect(migration).toContain("owner_id");
    expect(migration).toContain("values\" jsonb NOT NULL");
    expect(migration).toContain("row_version");
    expect(migration).toContain("creation_progress_owner_unique");
  });
});
