import "server-only";

import { draftMode } from "next/headers";

import { getCurrentUser } from "@/auth/authorization/current-user";
import { cmsPermissionCode } from "@/auth/authorization/permissions";
import { can } from "@/auth/authorization/policy";
import { eligibilityFocusSection, eligibilityFocusSectorItems } from "../EligibilityPageContent";
import { fundingPageSections } from "../FundingPageContent";
import { readFundingOverviewDocuments } from "../infrastructure/PayloadFundingOverviewRepository";

export async function getFundingOverview() {
  let documents: Awaited<ReturnType<typeof readFundingOverviewDocuments>> = [];
  if (process.env.SKIP_CMS_PRERENDER !== "1") {
    const requested = (await draftMode()).isEnabled;
    const draft = requested && can(
      await getCurrentUser(),
      cmsPermissionCode("pages", "read"),
    );
    documents = await readFundingOverviewDocuments(draft);
  }
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
