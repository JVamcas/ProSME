import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("branding settings migration", () => {
  it("stores only metadata for logos under the utilities brand prefix", async () => {
    const sql = await readFile(
      path.resolve(process.cwd(), "drizzle/0140_branding_settings.sql"),
      "utf8",
    );

    expect(sql).toContain("CREATE TABLE app_branding_settings");
    expect(sql).toContain("dev/utilities/brand/%");
    expect(sql).toContain("prod/utilities/brand/%");
    expect(sql).toContain("branding.read");
    expect(sql).toContain("branding.manage");
    expect(sql).not.toContain("bytea");
  });
});
