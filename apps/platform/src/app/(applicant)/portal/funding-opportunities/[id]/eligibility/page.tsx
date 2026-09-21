import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { EligibilityAssessment } from "@/components/applicant/eligibility/EligibilityAssessment";

export const metadata: Metadata = { title: "Eligibility check" };

export default async function EligibilityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const opportunityId = z.uuid().safeParse(id);
  if (!opportunityId.success) {
    notFound();
  }
  return <EligibilityAssessment fundingOpportunityId={opportunityId.data} />;
}
