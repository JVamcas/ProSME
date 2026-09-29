import { Banknote, CalendarDays } from "lucide-react";

import type { PublicFundingCallSummary } from "../../api/PublicFundingCallTransport";
import {
  formatOpportunityAmount,
  formatOpportunityDate,
} from "../FundingOpportunityFormat";

export function PublicFundingCallFacts({
  call,
}: {
  call: PublicFundingCallSummary;
}) {
  const upcoming = call.status === "upcoming";
  return (
    <dl className="grid gap-5 text-brand-navy sm:grid-cols-2">
      <div className="flex items-center gap-3">
        <Banknote aria-hidden className="size-6 shrink-0" />
        <div>
          <dt className="text-xs text-brand-navy/65">Funding amount</dt>
          <dd className="mt-1 text-sm font-bold">
            {formatOpportunityAmount(call)}
          </dd>
        </div>
      </div>
      <div className="flex items-center gap-3 sm:border-l sm:border-brand-blue/25 sm:pl-5">
        <CalendarDays aria-hidden className="size-6 shrink-0" />
        <div>
          <dt className="text-xs text-brand-navy/65">
            {upcoming ? "Opening date" : "Application deadline"}
          </dt>
          <dd className="mt-1 text-sm font-bold">
            {formatOpportunityDate(upcoming ? call.opensAt : call.closesAt)}
          </dd>
        </div>
      </div>
    </dl>
  );
}
