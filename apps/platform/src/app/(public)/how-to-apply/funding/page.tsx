import type { Metadata } from "next";
import { z } from "zod";

import { eligibilityFocusSection } from "@/modules/content/EligibilityPageContent";
import { fundingPageSections } from "@/modules/content/FundingPageContent";
import {
  getEligibilityContent,
  getPage,
} from "@/modules/content/ServerContentQueries";
import { HowToApplyNavigation } from "@/modules/content/ui/public/HowToApplyNavigation";
import { listPublicFundingCalls } from "@/modules/funding-calls/application/ServerPublicFundingCallService";
import { PublicFundingPage } from "@/modules/funding-calls/ui/public/PublicFundingPage";

export const metadata: Metadata = { title: "Funding calls" };

const filterSchema = z.enum(["open", "upcoming", "closed"]);

export default async function FundingPage({
  searchParams,
}: {
  searchParams: Promise<{ after?: string; status?: string }>;
}) {
  const params = await searchParams;
  const status = filterSchema.safeParse(params.status).data;
  const [calls, page, eligibilityPage, sectors] = await Promise.all([
    listPublicFundingCalls({ after: params.after, limit: 20, status }),
    getPage("funding"),
    getPage("eligibility"),
    getEligibilityContent(),
  ]);
  const sections = fundingPageSections(page?.blocks ?? []);
  return (
    <>
      <HowToApplyNavigation active="funding" />
      <PublicFundingPage
        calls={calls}
        focus={eligibilityFocusSection(eligibilityPage?.blocks ?? [])}
        priorities={sections.priorities}
        sectors={sectors}
        status={status}
        support={sections.support}
      />
    </>
  );
}
