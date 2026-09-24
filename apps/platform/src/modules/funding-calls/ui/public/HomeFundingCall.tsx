import { ArrowRight, CalendarDays, Coins, Sprout } from "lucide-react";
import Link from "next/link";

import { formatDate } from "@/lib/dateUtils";
import type { PublicFundingCallSummary } from "@/modules/funding-calls/api/PublicFundingCallTransport";
import { SanitizedRichTextContent } from "@/shared/ui/SanitizedRichTextContent";

export function HomeFundingCall({ call }: { call?: PublicFundingCallSummary }) {
  if (!call) return null;

  const status = statusContent(call);

  return (
    <section
      aria-labelledby="home-funding-call-title"
      className="bg-white py-12 sm:py-16"
    >
      <div className="container">
        <article className="grid overflow-hidden rounded-[2rem] border border-brand-navy/10 bg-white shadow-[0_18px_60px_rgba(10,24,59,0.08)] lg:grid-cols-[minmax(0,1fr)_minmax(320px,36%)]">
          <div className="relative p-7 sm:p-10 lg:px-12 lg:py-11">
            <div className="flex flex-wrap items-center gap-4">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${status.badgeClass}`}
              >
                <span aria-hidden="true" className="size-2 rounded-full bg-current" />
                {status.badge}
              </span>
              <span aria-hidden="true" className="hidden h-6 border-l border-brand-navy/15 sm:block" />
              <span className="text-xs font-semibold uppercase tracking-wider text-brand-navy/50">
                {call.reference}
              </span>
            </div>

            <h2
              id="home-funding-call-title"
              className="mt-7 max-w-2xl text-3xl font-bold leading-tight tracking-tight text-brand-navy sm:text-4xl"
            >
              {call.title}
            </h2>

            {call.summaryHtml ? (
              <SanitizedRichTextContent
                className="mt-5 line-clamp-3 max-h-[5.25rem] max-w-2xl overflow-hidden text-base [&>*+*]:mt-1"
                sanitizedHtml={call.summaryHtml}
              />
            ) : (
              <p className="mt-5 line-clamp-3 max-w-2xl text-base leading-7 text-brand-navy/75">
                {call.summary}
              </p>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-5">
              <Link
                href={`/funding/${call.slug}`}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-brand-orange px-6 text-sm font-bold text-white transition-colors hover:bg-brand-orange/90"
              >
                View call details
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              <Link
                href="/portal"
                className="text-sm font-bold text-brand-navy underline decoration-brand-navy/50 decoration-2 underline-offset-4 hover:text-brand-orange"
              >
                Track an application
              </Link>
            </div>

            <p className="mt-10 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.16em] text-brand-navy/50">
              <span aria-hidden="true" className="h-0.5 w-8 bg-brand-yellow" />
              Brighter businesses. A stronger Namibia.
            </p>
          </div>

          <aside className="relative overflow-hidden bg-brand-navy p-7 text-white sm:p-9 lg:p-10">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-44 -right-20 size-80 rotate-45 border-[28px] border-white/5"
            />
            <div className="relative">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-yellow">
                Funding at a glance
              </p>

              <div className="mt-9 flex items-start gap-4">
                <span className="grid size-11 shrink-0 place-items-center text-brand-yellow">
                  <CalendarDays aria-hidden="true" className="size-7 text-brand-yellow" />
                </span>
                <div>
                  <p className="text-sm text-white/65">{status.dateLabel}</p>
                  <p className="mt-1 text-lg font-bold sm:text-xl">{formatDate(status.date)}</p>
                </div>
              </div>

              <div className="my-8 border-t border-white/20" />

              <div className="flex items-start gap-4">
                <span className="grid size-11 shrink-0 place-items-center text-brand-yellow">
                  <Coins aria-hidden="true" className="size-7 text-brand-yellow" />
                </span>
                <div>
                  <p className="text-sm text-white/65">Funding per application</p>
                  <p className="mt-1 text-lg font-bold sm:text-xl">
                    {formatNad(call.minimumAmount)} – {formatNad(call.maximumAmount)}
                  </p>
                </div>
              </div>

              {call.fundingInstrument ? (
                <div className="mt-8 flex items-center gap-4 border-t border-white/20 pt-7">
                  <Sprout aria-hidden="true" className="size-7 shrink-0 text-brand-yellow" />
                  <p className="text-sm text-white/80">{call.fundingInstrument}</p>
                </div>
              ) : null}
            </div>
          </aside>
        </article>
      </div>
    </section>
  );
}

function formatNad(value: number) {
  return `N$${value.toLocaleString("en-NA")}`;
}

function statusContent(call: PublicFundingCallSummary) {
  if (call.status === "open") {
    return {
      badge: "Applications open",
      badgeClass: "bg-green-dark/10 text-green-dark",
      date: call.closesAt,
      dateLabel: "Application deadline",
    };
  }

  if (call.status === "upcoming") {
    return {
      badge: "Opening soon",
      badgeClass: "bg-brand-yellow/30 text-brand-navy",
      date: call.opensAt,
      dateLabel: "Applications open",
    };
  }

  return {
    badge: "Applications closed",
    badgeClass: "bg-slate-100 text-slate-600",
    date: call.closesAt,
    dateLabel: "Applications closed",
  };
}
