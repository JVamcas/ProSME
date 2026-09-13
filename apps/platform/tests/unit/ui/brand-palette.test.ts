import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const styles = readFileSync(
  resolve(process.cwd(), "src/app/globals.css"),
  "utf8",
);

describe("SME Fund brand palette", () => {
  it("keeps the client-approved colour values", () => {
    expect(styles).toContain("--color-brand-cream: #f6f4e2");
    expect(styles).toContain("--color-brand-yellow: #ffca45");
    expect(styles).toContain("--color-brand-blue: #6baed6");
    expect(styles).toContain("--color-brand-navy: #0a183b");
    expect(styles).toContain("--color-brand-gold: #c9a24d");
    expect(styles).toContain("--color-brand-green: #16a34a");
    expect(styles).toContain("--color-brand-orange: #ff6f00");
    expect(styles).not.toContain("#ffd400");
  });
});
