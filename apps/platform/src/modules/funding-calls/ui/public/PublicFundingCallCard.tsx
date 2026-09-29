import { ArrowRight } from "lucide-react";

import { GeneralButtonLink } from "@/components/ui/button";
import type { PublicFundingCallSummary } from "../../api/PublicFundingCallTransport";
import { PublicFundingCallFacts } from "./PublicFundingCallFacts";
import {
  publicEligibilityHref,
  publicFundingCallHref,
} from "./PublicFundingCallLinks";
import { PublicFundingCallStatus } from "./PublicFundingCallStatus";

export function PublicFundingCallCard({
  call,
}: {
  call: PublicFundingCallSummary;
}) {
  return (
    <article className="rounded-xl border border-brand-blue/30 bg-white p-5 sm:p-7">
      <PublicFundingCallStatus call={call} />
      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
        <div className="min-w-0">
          <h3 className="text-xl font-bold text-brand-navy sm:text-2xl">
            {call.title}
          </h3>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-brand-navy/70">
            {call.summary}
          </p>
        </div>
        <div className="border-t border-brand-blue/20 pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <PublicFundingCallFacts call={call} />
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <GeneralButtonLink
          className="min-h-11 rounded-lg"
          href={publicFundingCallHref(call.id)}
        >
          View call &amp; requirements
        </GeneralButtonLink>
        {call.selfCheckAvailable && call.status !== "closed" ? (
          <GeneralButtonLink
            className="min-h-11 rounded-lg"
            href={publicEligibilityHref(call.id)}
            variant="outline"
          >
            Check eligibility <ArrowRight aria-hidden className="size-4" />
          </GeneralButtonLink>
        ) : null}
      </div>
    </article>
  );
}
