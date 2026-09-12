import type { Metadata } from "next";

import { FundingPageView } from "@/components/public/funding-page-view";
import { contentMetadata } from "@/modules/content/content.metadata";
import { getFundingCalls, getPage } from "@/modules/content/content.queries";
import { fundingPageSections } from "@/modules/content/funding-page-content";

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
