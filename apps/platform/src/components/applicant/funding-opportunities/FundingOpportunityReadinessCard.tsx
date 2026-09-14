import { FileDown } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { FundingOpportunityDetail } from "@/modules/funding-opportunities/FundingOpportunityTypes";

export function FundingOpportunityReadinessCard({
  opportunity,
}: {
  opportunity: FundingOpportunityDetail;
}) {
  const canCheckEligibility = opportunity.status === "open";
  return (
    <aside className="rounded-2xl border border-brand-navy/15 bg-brand-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-brand-navy">Ready to apply?</h2>
      <p className="mt-2 text-sm leading-6 text-brand-navy/70">
        Check whether you meet the eligibility criteria before starting an
        application.
      </p>
      {canCheckEligibility ? (
        <Button asChild className="mt-5 w-full">
          <Link
            href={`/portal/funding-opportunities/${opportunity.id}/eligibility`}
          >
            Check eligibility
          </Link>
        </Button>
      ) : (
        <Button className="mt-5 w-full" disabled type="button">
          Check eligibility
        </Button>
      )}
      <Button className="mt-3 w-full" disabled type="button" variant="outline">
        <FileDown aria-hidden="true" className="size-4" />
        No Guidelines available
      </Button>
    </aside>
  );
}
