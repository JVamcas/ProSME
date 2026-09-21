import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { FundingOpportunityDetail } from "@/components/applicant/funding-opportunities/FundingOpportunityDetail";

export const metadata: Metadata = { title: "Funding opportunity" };

export default async function FundingOpportunityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const opportunityId = z.uuid().safeParse(id);

  if (!opportunityId.success) {
    notFound();
  }

  return <FundingOpportunityDetail opportunityId={opportunityId.data} />;
}
