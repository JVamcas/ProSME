import { describe, expect, it } from "vitest";

import { defaultFundingPriorities, defaultFundingSupport, fundingPageSections } from "@/modules/content/funding-page-content";

describe("funding page CMS sections", () => {
  it("maps published funding support and priority blocks", () => {
    const result = fundingPageSections([
      {
        blockType: "fundingSupport",
        cards: [{ description: "CMS card description", icon: "grant", title: "CMS card" }],
        description: "CMS description",
        eyebrow: "CMS support eyebrow",
        heading: "CMS support heading",
        uses: [{ label: "CMS use" }],
      },
      {
        blockType: "fundingPriorities",
        eyebrow: "CMS priority eyebrow",
        heading: "CMS priority heading",
        items: [{ description: "CMS priority description", icon: "growth", title: "CMS priority" }],
      },
    ]);

    expect(result.support).toMatchObject({ description: "CMS description", heading: "CMS support heading", uses: ["CMS use"] });
    expect(result.support.cards[0]).toMatchObject({ icon: "grant", title: "CMS card" });
    expect(result.priorities).toMatchObject({ eyebrow: "CMS priority eyebrow", heading: "CMS priority heading" });
    expect(result.priorities.items[0]).toMatchObject({ icon: "growth", title: "CMS priority" });
  });

  it("uses approved defaults until blocks are published", () => {
    const result = fundingPageSections([]);

    expect(result.support).toEqual(defaultFundingSupport);
    expect(result.priorities).toEqual(defaultFundingPriorities);
  });
});
