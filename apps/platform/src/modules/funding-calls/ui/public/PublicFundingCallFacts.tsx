import { Banknote, CalendarDays, Tag } from "lucide-react";

import { cn } from "@/lib/utils";
import type { PublicFundingCallSummary } from "../../api/PublicFundingCallTransport";
import {
  formatOpportunityAmount,
  formatOpportunityDate,
} from "../FundingOpportunityFormat";

export function PublicFundingCallFacts({
  call,
  compact = false,
}: {
  call: PublicFundingCallSummary;
  compact?: boolean;
}) {
  const upcoming = call.status === "upcoming";
  const fundingFocus = call.thematicArea || call.fundingInstrument;
  const datePrefix = upcoming
    ? "Opens "
    : call.status === "closed"
      ? "Closed "
      : "Closes ";
  return (
    <dl
      className={cn(
        "grid text-brand-navy",
        compact ? "gap-3 text-sm" : "gap-5 sm:grid-cols-2",
      )}
    >
      <div className="flex items-center gap-3">
        <Banknote
          aria-hidden
          className={compact ? "size-5 shrink-0" : "size-6 shrink-0"}
        />
        <div>
          <dt className={compact ? "sr-only" : "text-xs text-brand-navy/65"}>
            Funding amount
          </dt>
          <dd className={cn("font-semibold", !compact && "mt-1 text-sm font-bold")}>
            {formatOpportunityAmount(call)}
          </dd>
        </div>
      </div>
      <div
        className={cn(
          "flex items-center gap-3",
          !compact && "sm:border-l sm:border-brand-blue/25 sm:pl-5",
        )}
      >
        <CalendarDays
          aria-hidden
          className={compact ? "size-5 shrink-0" : "size-6 shrink-0"}
        />
        <div>
          <dt
            className={compact ? "sr-only" : "text-xs text-brand-navy/65"}
          >
            {upcoming ? "Opening date" : "Application deadline"}
          </dt>
          <dd className={cn("font-semibold", !compact && "mt-1 text-sm font-bold")}>
            {compact ? datePrefix : ""}
            {formatOpportunityDate(upcoming ? call.opensAt : call.closesAt)}
          </dd>
        </div>
      </div>
      {compact && fundingFocus ? (
        <div className="flex items-center gap-3">
          <Tag aria-hidden className="size-5 shrink-0" />
          <div>
            <dt className="sr-only">Funding focus</dt>
            <dd className="font-semibold">{fundingFocus}</dd>
          </div>
        </div>
      ) : null}
    </dl>
  );
}
