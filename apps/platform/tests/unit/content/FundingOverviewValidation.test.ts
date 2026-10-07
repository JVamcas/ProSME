import type { CollectionBeforeValidateHook } from "payload";
import { describe, expect, it } from "vitest";

import { validateFundingOverviewPage } from "@/payload/hooks/validate-funding-overview-page";
import { fundingOverviewDefaultBlocks, fundingOverviewSections, type FundingOverviewSlug } from "@/modules/content/FundingOverviewSections";

function validate(data: Record<string, unknown>, originalDoc?: Record<string, unknown>) {
  return validateFundingOverviewPage({ data, originalDoc } as Parameters<CollectionBeforeValidateHook>[0]);
}

describe("Overview document ownership", () => {
  it.each(Object.keys(fundingOverviewSections) as FundingOverviewSlug[])(
    "accepts the section's own layout and metadata-only updates for %s",
    (slug) => {
      const data = { slug, layout: fundingOverviewDefaultBlocks(slug) };
      expect(validate(data)).toBe(data);
      expect(validate({ _status: "published" }, data)).toEqual({ _status: "published" });
    },
  );

  it.each([[], [{ blockType: "fundingPriorities" }], [
    { blockType: "fundingSupport" }, { blockType: "fundingPriorities" },
  ]].map((layout) => ({ layout })))("rejects missing or foreign sections: $layout", ({ layout }) => {
    expect(() => validate({ slug: "funding-support", layout })).toThrow();
  });

  it.each([
    ["funding-support", "funding-priority-applicants"],
    ["funding-support", "privacy"],
    ["privacy", "funding-support"],
  ])("rejects reassignment from %s to %s", (originalSlug, slug) => {
    expect(() => validate({ slug }, { slug: originalSlug })).toThrow();
  });

  it("leaves unrelated and legacy Pages layouts intact", () => {
    const data = { slug: "funding", layout: [{ blockType: "hero" }] };
    expect(validate(data)).toBe(data);
  });
});
