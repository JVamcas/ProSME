import { ArrowRight } from "lucide-react";
import Link from "next/link";

import type {
  FundingPrioritiesContent,
  FundingSupportContent,
} from "@/modules/content/FundingPageContent";
import type { PublicFundingCallSummary } from "@/modules/funding-calls/api/PublicFundingCallTransport";
import {
  FundingCallToAction,
  FundingPriorities,
  FundingSupport,
} from "./funding-page-sections";

type Props = {
  calls: PublicFundingCallSummary[];
  priorities: FundingPrioritiesContent;
  summary: string;
  support: FundingSupportContent;
  title: string;
};

export function FundingPageView({
  calls,
  priorities,
  summary,
  support,
  title,
}: Props) {
  return (
    <>
      <FundingHero call={calls[0]} summary={summary} title={title} />
      <FundingCallList calls={calls} />
      <FundingSupport content={support} />
      <FundingPriorities content={priorities} />
      <FundingCallToAction />
    </>
  );
}

function FundingCallList({ calls }: Pick<Props, "calls">) {
  if (!calls.length) return null;
  return (
    <section className="section" aria-labelledby="funding-calls-heading">
      <div className="container">
        <h2
          className="text-3xl font-bold text-brand-navy"
          id="funding-calls-heading"
        >
          Funding calls
        </h2>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {calls.map((call) => (
            <article className="card p-6" key={call.id}>
              <p className="text-xs font-bold uppercase tracking-wide text-brand-orange">
                {call.reference} · {call.status}
              </p>
              <h3 className="mt-3 text-xl font-bold text-brand-navy">
                {call.title}
              </h3>
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-700">
                {call.summary}
              </p>
              <Link
                className="mt-5 inline-flex items-center gap-2 font-bold text-brand-navy underline"
                href={`/funding/${call.slug}`}
              >
                View call details <ArrowRight className="size-4" />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FundingHero({
  call,
  summary,
  title,
}: Pick<Props, "summary" | "title"> & {
  call?: PublicFundingCallSummary;
}) {
  return (
    <section className="bg-brand-navy py-20 text-brand-white">
      <div className="container grid gap-12 lg:grid-cols-[1fr_360px] lg:items-end">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[.16em] text-brand-orange">
            MSME Growth Grant
          </p>
          <h1 className="display mt-4 max-w-3xl text-5xl font-semibold sm:text-6xl">
            {withFullStop(title)}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-brand-white/75">
            {summary}
          </p>
        </div>
        <div className="rounded-3xl border border-brand-white/15 bg-brand-white/10 p-7">
          <p className="text-sm text-brand-white/70">Available grant</p>
          <p className="mt-2 text-4xl font-black text-brand-yellow">
            {money(call?.minimumAmount)}
          </p>
          <p className="text-lg font-semibold">
            to {money(call?.maximumAmount)}
          </p>
          <Link
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-orange px-5 text-sm font-bold text-brand-navy shadow-[0_8px_20px_rgba(10,24,59,0.18)] transition-colors hover:bg-brand-yellow"
            href="/eligibility"
          >
            Check eligibility <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function money(value?: number | null) {
  return value == null
    ? "To be confirmed"
    : `N$${value.toLocaleString("en-NA")}`;
}

function withFullStop(value: string) {
  return /[.!?]$/.test(value) ? value : `${value}.`;
}
