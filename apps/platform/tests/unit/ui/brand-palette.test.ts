import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const styles = readFileSync(
  resolve(process.cwd(), "src/shared/ui/brand-theme.css"),
  "utf8",
);
const tokens = readFileSync(
  resolve(process.cwd(), "src/shared/ui/brand-tokens.css"),
  "utf8",
);
const cmsStyles = readFileSync(
  resolve(process.cwd(), "src/modules/content/ui/admin/CmsAdminTheme.ts"),
  "utf8",
);
const publicLayout = readFileSync(
  resolve(process.cwd(), "src/app/(public)/layout.tsx"),
  "utf8",
);

describe("SME Fund brand palette", () => {
  it("keeps the client-approved colour values", () => {
    expect(tokens).toContain("--sme-brand-cream: #f6f4e2");
    expect(tokens).toContain("--sme-brand-yellow: #ffca45");
    expect(tokens).toContain("--sme-brand-blue: #6baed6");
    expect(tokens).toContain("--sme-brand-navy: #0a183b");
    expect(tokens).toContain("--sme-brand-gold: #c9a24d");
    expect(tokens).toContain("--sme-brand-green: #16a34a");
    expect(tokens).toContain("--sme-brand-orange: #ff6f00");
    expect(tokens).not.toContain("#ffd400");
    expect(styles).toContain("--color-brand-navy: var(--sme-brand-navy)");
    expect(cmsStyles).toContain("[&_.btn--style-primary]:bg-brand-navy");
  });

  it("uses the complete Bahnschrift font with its full weight range", () => {
    const font = statSync(
      resolve(process.cwd(), "src/app/fonts/bahnschrift.ttf"),
    );

    expect(font.size).toBeGreaterThan(300_000);
    expect(publicLayout).toContain('weight: "100 900"');
  });
});
