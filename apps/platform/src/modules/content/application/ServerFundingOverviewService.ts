import "server-only";

import { getContentReadMode } from "./ServerContentReadService";
import { readPublishedFundingOverview } from "../infrastructure/PublishedContentRepository";
import {
  eligibilityFocusSection,
  eligibilityFocusSectorItems,
} from "../EligibilityPageContent";
import { fundingPageSections } from "../FundingPageContent";
import { readFundingOverviewDocuments } from "../infrastructure/PayloadFundingOverviewRepository";

export async function getFundingOverview() {
  const { draft } = await getContentReadMode("pages");
  const documents = draft
    ? await readFundingOverviewDocuments(true)
    : await readPublishedFundingOverview();
  const blocks = (slug: string) =>
    documents.find((document) => document.slug === slug)?.layout ?? [];
  const focusBlocks = blocks("funding-focus-sectors");
  return {
    support: fundingPageSections(blocks("funding-support")).support,
    priorities: fundingPageSections(blocks("funding-priority-applicants")).priorities,
    focus: eligibilityFocusSection(focusBlocks),
    sectors: eligibilityFocusSectorItems(focusBlocks),
  };
}
