import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.resolve(process.cwd(), "drizzle/0067_funding_call_state_machine.sql"),
  "utf8",
);

describe("funding call lifecycle migration", () => {
  it("migrates legacy names into the canonical state family", () => {
    expect(migration).toContain("WHEN 'OPEN' THEN 'LIVE'");
    expect(migration).toContain("WHEN 'CANCELLED' THEN 'WITHDRAWN'");
    expect(migration).toContain("'APPROVAL_PENDING'");
    expect(migration).toContain("'SUSPENDED'");
    expect(migration).toContain("'ARCHIVED'");
  });

  it("persists immutable transition reconstruction fields", () => {
    expect(migration).toContain('"source_status" text NOT NULL');
    expect(migration).toContain('"target_status" text NOT NULL');
    expect(migration).toContain('"command_time" timestamp with time zone NOT NULL');
    expect(migration).toContain('"effective_time" timestamp with time zone NOT NULL');
    expect(migration).toContain('"row_version" integer NOT NULL');
    expect(migration).toContain('"correlation_id" text NOT NULL');
    expect(migration).toContain('"idempotency_key" text NOT NULL');
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "app_funding_call_lifecycle_idempotency_unique"',
    );
  });
});
