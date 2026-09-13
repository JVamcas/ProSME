import type { Metadata } from "next";

import { FundingPageView } from "@/components/public/funding-page-view";
import { contentMetadata } from "@/modules/content/ContentMetadata";
import { getFundingCalls, getPage } from "@/modules/content/ServerContentQueries";
import { fundingPageSections } from "@/modules/content/FundingPageContent";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("funding");
  return page ? contentMetadata(page) : {};
}

export default async function FundingPage() {
  const [calls, page] = await Promise.all([getFundingCalls(), getPage("funding")]);
  const sections = fundingPageSections(page?.blocks ?? []);
  return <FundingPageView call={calls[0]} priorities={sections.priorities} summary={page?.summary ?? ""} support={sections.support} title={page?.title ?? ""} />;
}
