import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentUser } from "@/auth/authorization/current-user";
import {
  FundingOpportunityDetail,
  FundingOpportunityStatus,
} from "@/components/applicant/funding-opportunities/FundingOpportunityDetail";
import {
  FundingOpportunityNotFoundError,
  getFundingOpportunity,
} from "@/modules/funding-calls/ServerFundingOpportunityService";
import { PageShell } from "@/shared/ui/PageShell";

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

  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=/portal/funding-opportunities");
  let opportunity: Awaited<ReturnType<typeof getFundingOpportunity>>;
  try {
    opportunity = await getFundingOpportunity(user, opportunityId.data);
  } catch (error) {
    if (error instanceof FundingOpportunityNotFoundError) notFound();
    throw error;
  }

  return (
    <PageShell
      actions={<FundingOpportunityStatus opportunity={opportunity} />}
      backLink={(
        <Link
          className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand-navy hover:underline"
          href="/portal/funding-opportunities"
        >
          <ChevronLeft
            aria-hidden="true"
            className="size-4 text-brand-orange"
          />
          Back to opportunities
        </Link>
      )}
      title={opportunity.title}
    >
      <FundingOpportunityDetail opportunity={opportunity} />
    </PageShell>
  );
}
