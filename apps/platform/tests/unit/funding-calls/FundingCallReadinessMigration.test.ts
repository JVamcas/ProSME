import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("funding call publication readiness migration", () => {
  it("persists explicit public-document safety decisions", () => {
    const sql = readFileSync(
      new URL("../../../drizzle/0068_funding_call_publication_readiness.sql", import.meta.url),
      "utf8",
    );

    expect(sql).toContain('ADD COLUMN "finalized" boolean DEFAULT false NOT NULL');
    expect(sql).toContain('ADD COLUMN "security_cleared" boolean DEFAULT false NOT NULL');
    expect(sql).toContain('ADD COLUMN "marked_for_publication" boolean DEFAULT false NOT NULL');
  });
});
