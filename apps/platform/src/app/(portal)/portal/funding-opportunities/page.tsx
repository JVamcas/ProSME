import type { Metadata } from "next";

import { FundingOpportunityBrowser } from "@/components/applicant/funding-opportunities/FundingOpportunityBrowser";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Funding opportunities" };

export default async function FundingOpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const status = (await searchParams).status;
  const initialFilter = status === "open" ? "open" : "all";
  return (
    <section>
      <PageHeader
        description="Explore published funding programmes and find the right opportunity for your business."
        title="Funding opportunities"
      />
      <FundingOpportunityBrowser initialFilter={initialFilter} />
    </section>
  );
}
