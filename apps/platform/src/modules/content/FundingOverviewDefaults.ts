import { defaultEligibilityFocusSection } from "./EligibilityPageContent";
import { defaultFundingPriorities, defaultFundingSupport } from "./FundingPageContent";

export const defaultFundingOverviewBlocks = [
  {
    blockType: "fundingSupport" as const,
    ...defaultFundingSupport,
    uses: defaultFundingSupport.uses.map((label) => ({ label })),
  },
  {
    blockType: "fundingPriorities" as const,
    ...defaultFundingPriorities,
  },
];

export const defaultFocusSectorBlocks = [
  {
    blockType: "eligibilityFocusSectors" as const,
    ...defaultEligibilityFocusSection,
  },
];
