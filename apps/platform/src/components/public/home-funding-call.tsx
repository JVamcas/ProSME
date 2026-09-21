import { ArrowRight, CalendarDays } from "lucide-react";
import Link from "next/link";

import type { FundingCallItem } from "@/modules/content/ContentTypes";

export function HomeFundingCall({ call }: { call?: FundingCallItem }) {
  if (!call) return null;
  const status = statusContent(call);

  return (
    <section
      className="bg-white py-12"
      aria-labelledby="home-funding-call-title"
    >
      <div className="container grid gap-8 rounded-2xl bg-brand-blue/5 p-7 lg:grid-cols-[1.5fr_.8fr] lg:p-10">
        <div>
          <span
            className={`inline-flex rounded-md px-3 py-2 text-xs font-extrabold uppercase ${status.badgeClass}`}
          >
            {status.badge}
          </span>
          <h2
            className="mt-5 text-3xl font-bold text-brand-navy"
            id="home-funding-call-title"
          >
            {call.title}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-brand-navy">
            {call.summary}
          </p>
          <Link
            href={`/funding/${call.slug}`}
            className="mt-5 inline-flex items-center gap-2 font-bold text-brand-navy underline"
          >
            View call details{" "}
            <ArrowRight className="size-4 text-brand-orange" />
          </Link>
        </div>
        <div className="rounded-2xl bg-brand-cream p-6">
          <div className="flex items-start gap-4 text-brand-navy">
            <CalendarDays className="mt-1 size-8 shrink-0 text-brand-orange" />
            <p>
              <span className="block text-sm">{status.dateLabel}</span>
              <strong className="mt-1 block text-xl">
                {formatDate(status.date)}
              </strong>
            </p>
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/portal"
              className="inline-flex min-h-12 items-center rounded-xl border border-brand-orange bg-white px-6 text-sm font-bold text-brand-navy"
            >
              Track Application
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function statusContent(call: FundingCallItem) {
  if (call.status === "open")
    return {
      badge: "Current funding call",
      badgeClass: "bg-green-dark text-brand-white",
      date: call.closesAt,
      dateLabel: "Application deadline",
    };
  if (call.status === "upcoming")
    return {
      badge: "Upcoming funding call",
      badgeClass: "bg-brand-yellow text-brand-navy",
      date: call.opensAt,
      dateLabel: "Applications open",
    };
  return {
    badge: "Closed funding call",
    badgeClass: "bg-slate-200 text-slate-700",
    date: call.closesAt,
    dateLabel: "Applications closed",
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NA", { dateStyle: "long" }).format(
    new Date(value),
  );
}
