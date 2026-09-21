import { FileDown } from "lucide-react";
import Link from "next/link";

import { GeneralButton } from "@/components/ui/button";
import type { PublicFundingCallDetail } from "@/modules/funding-calls/api/PublicFundingCallTransport";

export function FundingOpportunityReadinessCard({
  opportunity,
}: {
  opportunity: PublicFundingCallDetail;
}) {
  const canCheckEligibility =
    opportunity.selfCheckAvailable && opportunity.status !== "closed";
  const guidanceDocument = opportunity.publicDocuments[0];
  return (
    <aside className="rounded-2xl border border-brand-navy/15 bg-brand-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-brand-navy">Ready to apply?</h2>
      <p className="mt-2 text-sm leading-6 text-brand-navy/70">
        Check whether you meet the eligibility criteria before starting an
        application.
      </p>
      {canCheckEligibility ? (
        <GeneralButton asChild className="mt-5 w-full">
          <Link
            href={`/portal/funding-opportunities/${opportunity.id}/eligibility`}
          >
            Check eligibility
          </Link>
        </GeneralButton>
      ) : (
        <GeneralButton className="mt-5 w-full" disabled type="button">
          Check eligibility
        </GeneralButton>
      )}
      {guidanceDocument ? (
        <GeneralButton asChild className="mt-3 w-full" variant="outline">
          <a href={guidanceDocument.url}>
            <FileDown aria-hidden="true" className="size-4" />
            {guidanceDocument.label}
          </a>
        </GeneralButton>
      ) : (
        <GeneralButton
          className="mt-3 w-full"
          disabled
          type="button"
          variant="outline"
        >
          <FileDown aria-hidden="true" className="size-4" />
          No guidelines available
        </GeneralButton>
      )}
    </aside>
  );
}
