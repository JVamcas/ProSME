import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const capabilityMigration = readFileSync(
  path.resolve(process.cwd(), "drizzle/0001_phase2_cms_authorization.sql"),
  "utf8",
);
const auditMigration = readFileSync(
  path.resolve(process.cwd(), "drizzle/0002_authorization_audit_schema.sql"),
  "utf8",
);

describe("Phase 2 authorization migration", () => {
  it("adds the publisher role and every CMS resource namespace", () => {
    expect(capabilityMigration).toContain("cms_publisher");
    for (const resource of [
      "pages",
      "news",
      "resources",
      "events",
      "faqs",
      "funding-calls",
      "eligibility",
      "statistics",
      "media",
      "site-settings",
      "engagement-submissions",
    ]) {
      expect(capabilityMigration).toContain(`('${resource}', ARRAY[`);
    }
  });

  it("makes authorization audit records immutable", () => {
    expect(auditMigration).toContain("BEFORE UPDATE OR DELETE");
    expect(auditMigration).toContain("authorization audit entries are immutable");
  });
});
