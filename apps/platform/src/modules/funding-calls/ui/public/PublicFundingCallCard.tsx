import { ArrowRight } from "lucide-react";
import Link from "next/link";

import type { PublicFundingCallSummary } from "../../api/PublicFundingCallTransport";
import { FundingCallThumbnailImage } from "../FundingCallThumbnailImage";
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
  const detailHref = publicFundingCallHref(call.id);

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-brand-navy/15 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-brand-orange/60 hover:shadow-md">
      <div className="relative aspect-[3/2] overflow-hidden bg-brand-cream">
        {call.thumbnailUrl ? (
          <FundingCallThumbnailImage
            alt=""
            className="object-cover transition duration-300 group-hover:scale-[1.02]"
            sizes="(min-width: 640px) 384px, 85vw"
            src={call.thumbnailUrl}
          />
        ) : (
          <div
            aria-hidden
            className="h-full bg-gradient-to-br from-brand-blue/20 via-brand-cream to-brand-orange/20"
          />
        )}
        <PublicFundingCallStatus
          call={call}
          className="absolute left-4 top-4 rounded-md bg-brand-yellow px-3 py-2 font-bold uppercase shadow-sm before:hidden"
        />
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="min-w-0">
          <h3 className="text-xl font-bold leading-tight text-brand-navy">
            <Link
              className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-brand-navy focus-visible:after:ring-offset-2"
              href={detailHref}
            >
              {call.title}
            </Link>
          </h3>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-brand-navy/70 sm:text-base">
            {call.summary}
          </p>
        </div>

        <div className="mt-5 border-t border-brand-navy/10 pt-4">
          <PublicFundingCallFacts call={call} compact />
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 pt-5 text-sm font-semibold">
          <span className="inline-flex items-center gap-2 text-brand-navy transition group-hover:text-brand-orange">
            View call <ArrowRight aria-hidden className="size-4" />
          </span>
          {call.selfCheckAvailable && call.status !== "closed" ? (
            <Link
              className="relative z-10 text-brand-orange underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy focus-visible:ring-offset-2"
              href={publicEligibilityHref(call.id)}
            >
              Check eligibility
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}
