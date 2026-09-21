import type { Metadata } from "next";

import { FundingPageView } from "@/components/public/funding-page-view";
import { contentMetadata } from "@/modules/content/ContentMetadata";
import { getPage } from "@/modules/content/ServerContentQueries";
import { fundingPageSections } from "@/modules/content/FundingPageContent";
import { listPublicFundingCalls } from "@/modules/funding-calls/application/ServerPublicFundingCallService";



export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("funding");
  return page ? contentMetadata(page) : {};
}

export default async function FundingPage() {
  const [calls, page] = await Promise.all([
    listPublicFundingCalls({ limit: 20 }),
    getPage("funding"),
  ]);
  const sections = fundingPageSections(page?.blocks ?? []);
  return (
    <FundingPageView
      calls={calls.items}
      priorities={sections.priorities}
      summary={page?.summary ?? ""}
      support={sections.support}
      title={page?.title ?? ""}
    />
  );
}
