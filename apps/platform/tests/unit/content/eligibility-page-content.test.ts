import { describe, expect, it } from "vitest";

import { defaultEligibilityFocusSection, eligibilityFocusSection } from "@/modules/content/eligibility-page-content";

describe("eligibility focus-sector CMS section", () => {
  it("maps the published section copy", () => {
    const result = eligibilityFocusSection([{ blockType: "eligibilityFocusSectors", eyebrow: "CMS eyebrow", heading: "CMS heading", noticeHeading: "CMS notice heading", notice: "CMS notice" }]);

    expect(result).toEqual({ eyebrow: "CMS eyebrow", heading: "CMS heading", noticeHeading: "CMS notice heading", notice: "CMS notice" });
  });

  it("uses the approved fallback until the block is published", () => {
    expect(eligibilityFocusSection([])).toEqual(defaultEligibilityFocusSection);
  });
});
