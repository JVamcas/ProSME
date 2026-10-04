import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repairMigration = readFileSync(
  path.resolve(
    process.cwd(),
    "drizzle/0145_restore_funding_call_governance_policy.sql",
  ),
  "utf8",
);
const resetScript = readFileSync(
  path.resolve(process.cwd(), "../../scripts/seed/reset-platform-data.ts"),
  "utf8",
);

describe("funding call governance policy reset safety", () => {
  it("preserves the singleton policy during local data resets", () => {
    expect(resetScript).toContain('"app_funding_call_governance_policy"');
    expect(resetScript).toContain(
      "AND tablename <> 'app_funding_call_governance_policy'",
    );
  });

  it("repairs databases affected by the previous reset behavior", () => {
    expect(repairMigration).toContain(
      'INSERT INTO "app_funding_call_governance_policy"',
    );
    expect(repairMigration).toContain("VALUES (1, true, true)");
    expect(repairMigration).toContain('ON CONFLICT ("id") DO NOTHING');
  });
});
