import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FundingOpportunityDetail } from "@/components/applicant/funding-opportunities/FundingOpportunityDetail";

export const metadata: Metadata = { title: "Funding opportunity" };

export default async function FundingOpportunityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const opportunityId = Number(id);

  if (!Number.isInteger(opportunityId) || opportunityId <= 0) {
    notFound();
  }

  return <FundingOpportunityDetail opportunityId={opportunityId} />;
}
