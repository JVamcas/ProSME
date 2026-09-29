import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import type { PublicFundingCallSummary } from "@/modules/funding-calls/api/PublicFundingCallTransport";
import { publicFundingCallHref } from "@/modules/funding-calls/ui/public/PublicFundingCallLinks";
import { PublicFundingCallStatus } from "@/modules/funding-calls/ui/public/PublicFundingCallStatus";

export function EligibilityCallContext({
  call,
}: {
  call: PublicFundingCallSummary;
}) {
  return (
    <section
      aria-label="Selected funding call"
      className="mb-6 rounded-xl border border-brand-blue/25 bg-brand-blue/5 p-5 sm:p-7"
    >
      <p className="text-xs font-bold uppercase tracking-widest text-brand-navy/70">
        You are checking
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-bold text-brand-navy sm:text-2xl">
          {call.title}
        </h2>
        <PublicFundingCallStatus call={call} />
      </div>
      <Link
        className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-navy underline"
        href={publicFundingCallHref(call.id)}
      >
        <ArrowLeft aria-hidden className="size-4" /> Back to call details
      </Link>
    </section>
  );
}
