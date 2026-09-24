import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Badge, badgeVariants } from "@/shared/ui/Badge";

describe("shared badge", () => {
  it("uses the primary app colours by default", () => {
    const markup = renderToStaticMarkup(<Badge>New</Badge>);

    expect(markup).toContain("bg-brand-orange");
    expect(markup).toContain("text-brand-white");
  });

  it.each([
    ["navy", "bg-brand-navy", "text-brand-white"],
    ["gold", "bg-brand-gold", "text-brand-navy"],
    ["yellow", "bg-brand-yellow", "text-brand-navy"],
    ["success", "bg-brand-green", "text-brand-white"],
    ["outlineOrange", "border-brand-orange", "text-brand-orange"],
  ] as const)("renders the %s app colour variant", (variant, background, text) => {
    const markup = renderToStaticMarkup(
      <Badge variant={variant}>{variant}</Badge>,
    );

    expect(markup).toContain(background);
    expect(markup).toContain(text);
  });

  it("supports sizes, native span attributes, and class overrides", () => {
    const markup = renderToStaticMarkup(
      <Badge
        aria-label="Application status"
        className="bg-brand-blue"
        size="lg"
      >
        Submitted
      </Badge>,
    );

    expect(markup).toContain('aria-label="Application status"');
    expect(markup).toContain("bg-brand-blue");
    expect(markup).not.toContain("bg-brand-orange");
    expect(markup).toContain("text-sm");
  });

  it("exports variant classes for composed UI", () => {
    expect(badgeVariants({ variant: "subtle" })).toContain(
      "bg-brand-orange/10",
    );
  });
});
