import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.resolve(
    process.cwd(),
    "drizzle/0146_repair_application_submission_recipients.sql",
  ),
  "utf8",
);

describe("application submission notification recipient repair", () => {
  it("removes relationship recipients unavailable during submission", () => {
    expect(migration).toContain("event.event_key = 'application.submitted'");
    expect(migration).toContain(
      "recipient.recipient_type IN ('ASSIGNED_USER', 'FUNDING_CALL_STAKEHOLDER')",
    );
  });
});
