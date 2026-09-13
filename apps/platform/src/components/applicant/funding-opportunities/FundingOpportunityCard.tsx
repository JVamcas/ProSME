import { Banknote, CalendarDays } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import type { FundingOpportunitySummary } from "@/modules/funding-opportunities/FundingOpportunityTypes";
import {
  formatOpportunityAmount,
  opportunityDateLabel,
} from "./FundingOpportunityFormat";

export function FundingOpportunityCard({
  opportunity,
}: {
  opportunity: FundingOpportunitySummary;
}) {
  return (
    <article className="rounded-2xl border border-brand-navy/15 bg-brand-white p-5 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-brand-navy">
            {opportunity.title}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-brand-navy/70">
            {opportunity.summary}
          </p>
        </div>

        <div className="flex items-start justify-end gap-2">
          <StatusBadge status={opportunity.status} />
          <span
            aria-label={`Important date: ${opportunityDateLabel(opportunity)}`}
            className="inline-flex rounded-full border border-brand-gold/40 bg-brand-cream px-3 py-1 text-xs font-bold text-brand-navy"
          >
            {opportunityDateLabel(opportunity)}
          </span>
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-4 border-t border-brand-navy/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <dl className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-brand-navy">
          <div className="flex items-center gap-2">
            <Banknote aria-hidden="true" className="size-5 text-brand-orange" />
            <div>
              <dt className="sr-only">Funding amount</dt>
              <dd>{formatOpportunityAmount(opportunity)}</dd>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays
              aria-hidden="true"
              className="size-5 text-brand-orange"
            />
            <div>
              <dt className="sr-only">Important date</dt>
              <dd>{opportunityDateLabel(opportunity)}</dd>
            </div>
          </div>
        </dl>
        <Button asChild className="w-full sm:w-auto">
          <Link href={`/portal/funding-opportunities/${opportunity.id}`}>
            View details
          </Link>
        </Button>
      </div>
    </article>
  );
}
