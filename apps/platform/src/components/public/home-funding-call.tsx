import { CalendarDays, Coins, FileText } from "lucide-react";
import Link from "next/link";

import { formatDate } from "@/lib/dateUtils";
import type { PublicFundingCallSummary } from "@/modules/funding-calls/api/PublicFundingCallTransport";
import { ArrowLink } from "../ui/links";

export function HomeFundingCall({ call }: { call?: PublicFundingCallSummary }) {
  if (!call) return null;

  const status = statusContent(call);

  return (
    <section
      aria-labelledby="home-funding-call-title"
      className="bg-white py-12"
    >
      <div className="container">
        <div className="overflow-hidden rounded-3xl border border-brand-navy/10 bg-white shadow-sm">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_340px]">
            {/* Main content */}
            <div className="relative overflow-hidden p-7 sm:p-9 lg:p-10">
              <div className="relative z-10 max-w-[620px]">
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide ${status.badgeClass}`}
                >
                  <span className="size-2 rounded-full bg-current" />
                  {status.badge}
                </span>

                <h2
                  id="home-funding-call-title"
                  className="mt-6 max-w-xl text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl"
                >
                  {call.title}
                </h2>

                <p className="mt-4 max-w-xl text-base leading-7 text-brand-navy/75">
                  {call.summary}
                </p>

                <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
                  <Link
                    href={`/funding/${call.id}`}
                    className="inline-flex min-h-12 items-center rounded-xl bg-brand-orange px-6 text-sm font-bold text-white transition hover:bg-brand-orange/90"
                  >
                    View call details
                  </Link>

                  <ArrowLink href="/portal">Track application</ArrowLink>
                </div>
              </div>

              <FundingIllustration />
            </div>

            {/* Deadline */}
            <aside className="border-t border-brand-navy/10 bg-brand-cream/60 p-6 lg:border-l lg:border-t-0 lg:p-8">
              <div className="flex items-start gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-orange/10">
                  <CalendarDays
                    aria-hidden="true"
                    className="size-6 text-brand-orange"
                  />
                </span>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-navy/60">
                    {status.dateLabel}
                  </p>

                  <p className="mt-2 text-2xl font-bold text-brand-navy">
                    {formatDate(status.date)}
                  </p>
                </div>
              </div>

              <div className="my-6 border-t border-brand-navy/10" />

              <div
                className={`inline-flex items-center gap-2 text-sm font-semibold ${status.statusClass}`}
              >
                <span className="size-2.5 rounded-full bg-current" />
                {status.message}
              </div>

              <p className="mt-3 text-sm leading-6 text-brand-navy/65">
                {status.description}
              </p>
            </aside>
          </div>

          {/* Funding information */}
          <div className="grid border-t border-brand-navy/10 sm:grid-cols-2">
            <FundingInfo
              icon={Coins}
              label="Funding amount per application"
              value={`${formatNad(call.minimumAmount)} – ${formatNad(
                call.maximumAmount,
              )}`}
            />
            {call.fundingInstrument && (
              <FundingInfo
                border
                icon={FileText}
                label="Funding instrument"
                value={call.fundingInstrument}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function FundingInfo({
  border = false,
  icon: Icon,
  label,
  value,
}: {
  border?: boolean;
  icon: typeof Coins;
  label: string;
  value: string;
}) {
  return (
    <div
      className={[
        "flex items-center gap-4 px-7 py-6 sm:px-9",
        border ? "border-t border-brand-navy/10 sm:border-l sm:border-t-0" : "",
      ].join(" ")}
    >
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-blue/5">
        <Icon aria-hidden="true" className="size-6 text-brand-navy" />
      </span>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-navy/55">
          {label}
        </p>

        <p className="mt-1 text-lg font-bold text-brand-navy">{value}</p>
      </div>
    </div>
  );
}

function FundingIllustration() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute bottom-0 right-0 hidden h-full w-[42%] lg:block"
      viewBox="0 0 420 360"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background */}
      <path
        d="M160 0H420V360H120C88 303 75 237 85 172C95 104 119 48 160 0Z"
        fill="#EEF6FC"
      />

      <circle cx="205" cy="160" r="72" fill="#FDE4CD" />

      {/* Birds */}
      <path
        d="M277 89C287 78 297 78 307 89C317 78 327 78 337 89"
        stroke="#173B70"
        strokeWidth="4"
        strokeLinecap="round"
      />

      <path
        d="M329 126C339 115 349 115 359 126C369 115 379 115 389 126"
        stroke="#173B70"
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* Ground */}
      <path d="M124 292H420" stroke="#173B70" strokeWidth="4" />

      {/* Buildings */}
      <rect x="161" y="250" width="18" height="42" fill="#5E8DBB" />
      <rect x="181" y="236" width="23" height="56" fill="#7AA5CC" />
      <rect x="207" y="260" width="17" height="32" fill="#96B9D8" />
      <rect x="228" y="243" width="28" height="49" fill="#719BC2" />

      {/* Crane one */}
      <path
        d="M253 292V173M253 173L299 222M253 173L242 222"
        stroke="#275A8F"
        strokeWidth="5"
      />
      <path
        d="M244 184H310"
        stroke="#275A8F"
        strokeWidth="5"
        strokeLinecap="round"
      />

      <path d="M282 185V253" stroke="#275A8F" strokeWidth="3" />

      {/* Crane two */}
      <path
        d="M329 292V160M329 160L383 211M329 160L318 211"
        stroke="#173B70"
        strokeWidth="5"
      />
      <path
        d="M320 174H399"
        stroke="#173B70"
        strokeWidth="5"
        strokeLinecap="round"
      />

      <path d="M368 175V238" stroke="#173B70" strokeWidth="3" />

      {/* Ship */}
      <path d="M320 263H420V315H343L320 284V263Z" fill="#173B70" />

      <rect x="347" y="239" width="24" height="23" fill="#F36F21" />
      <rect x="373" y="239" width="24" height="23" fill="#F36F21" />
      <rect x="399" y="239" width="21" height="23" fill="#F36F21" />

      <rect x="360" y="214" width="24" height="23" fill="#F36F21" />
      <rect x="386" y="214" width="24" height="23" fill="#F36F21" />

      {/* Water */}
      <path
        d="M151 312H300"
        stroke="#D5E8F7"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M130 330H250"
        stroke="#D5E8F7"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M205 345H325"
        stroke="#D5E8F7"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function formatNad(value: number) {
  return `N$${value.toLocaleString("en-NA")}`;
}

function statusContent(call: PublicFundingCallSummary) {
  if (call.status === "open") {
    return {
      badge: "Current funding call",
      badgeClass: "bg-green-dark/10 text-green-dark",
      date: call.closesAt,
      dateLabel: "Application deadline",
      message: "Applications are currently open",
      statusClass: "text-green-dark",
      description:
        "Submit your application before the deadline to be considered.",
    };
  }

  if (call.status === "upcoming") {
    return {
      badge: "Upcoming funding call",
      badgeClass: "bg-brand-yellow text-brand-navy",
      date: call.opensAt,
      dateLabel: "Applications open",
      message: "Applications are opening soon",
      statusClass: "text-brand-navy",
      description:
        "You will be able to submit an application once the funding call opens.",
    };
  }

  return {
    badge: "Closed funding call",
    badgeClass: "bg-slate-200 text-slate-700",
    date: call.closesAt,
    dateLabel: "Applications closed",
    message: "Applications are closed",
    statusClass: "text-slate-600",
    description: "This funding call is no longer accepting applications.",
  };
}
