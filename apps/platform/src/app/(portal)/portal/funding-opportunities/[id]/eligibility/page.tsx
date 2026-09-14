import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EligibilityAssessment } from "@/components/applicant/eligibility/EligibilityAssessment";

export const metadata: Metadata = { title: "Eligibility check" };

export default async function EligibilityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const opportunityId = Number(id);
  if (!Number.isInteger(opportunityId) || opportunityId <= 0) {
    notFound();
  }
  return <EligibilityAssessment fundingOpportunityId={opportunityId} />;
}

