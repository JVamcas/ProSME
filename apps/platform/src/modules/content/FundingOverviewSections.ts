import { defaultEligibilityFocusSection } from "./EligibilityPageContent";
import { defaultFundingOverviewBlocks } from "./FundingOverviewDefaults";

export const fundingOverviewSections = {
  "funding-support": {
    blockType: "fundingSupport",
    title: "What the fund supports",
    href: "/cms/funding/overview/support",
  },
  "funding-priority-applicants": {
    blockType: "fundingPriorities",
    title: "Priority applicants",
    href: "/cms/funding/overview/priority-applicants",
  },
  "funding-focus-sectors": {
    blockType: "eligibilityFocusSectors",
    title: "Focus sectors",
    href: "/cms/funding/overview/focus-sectors",
  },
} as const;

export type FundingOverviewSlug = keyof typeof fundingOverviewSections;

export function fundingOverviewSection(slug: unknown) {
  if (
    slug === "funding-support" ||
    slug === "funding-priority-applicants" ||
    slug === "funding-focus-sectors"
  ) {
    return fundingOverviewSections[slug];
  }
  return undefined;
}

export function fundingOverviewDefaultBlocks(slug: FundingOverviewSlug) {
  const section = fundingOverviewSections[slug];
  if (slug === "funding-focus-sectors") {
    return [{
      blockType: "eligibilityFocusSectors" as const,
      ...defaultEligibilityFocusSection,
      sectors: [],
    }];
  }
  return defaultFundingOverviewBlocks.filter(
    (block) => block.blockType === section.blockType,
  );
}
