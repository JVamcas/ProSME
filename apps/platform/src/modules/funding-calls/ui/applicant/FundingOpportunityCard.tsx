"use client";

import { ArrowRight, Banknote, Bookmark, CalendarDays, FileText, Sprout } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore, type ReactNode } from "react";

import { GeneralButton } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import type { PublicFundingCallSummary } from "@/modules/funding-calls/api/PublicFundingCallTransport";
import { formatOpportunityDate, opportunityDateLabel } from "@/components/applicant/funding-opportunities/FundingOpportunityFormat";

const savedStorageKey = "sme-fund-saved-opportunities";
const savedChangeEvent = "sme-fund-saved-opportunities-changed";
const amountFormatter = new Intl.NumberFormat("en-NA", { maximumFractionDigits: 0 });

function savedOpportunityIds(): string[] {
  try {
    const stored = JSON.parse(window.localStorage.getItem(savedStorageKey) ?? "[]");
    return Array.isArray(stored)
      ? stored.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

function subscribeToSavedOpportunities(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(savedChangeEvent, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(savedChangeEvent, onChange);
  };
}

function SaveOpportunityButton({ id }: { id: string }) {
  const saved = useSyncExternalStore(
    subscribeToSavedOpportunities,
    () => savedOpportunityIds().includes(id),
    () => false,
  );

  function toggleSaved() {
    const ids = new Set(savedOpportunityIds());
    if (ids.has(id)) ids.delete(id);
    else ids.add(id);
    try {
      window.localStorage.setItem(savedStorageKey, JSON.stringify([...ids]));
      window.dispatchEvent(new Event(savedChangeEvent));
    } catch {
      // Browser storage can be unavailable; keep the visible state truthful.
    }
  }

  return (
    <GeneralButton
      aria-pressed={saved}
      className="w-full rounded-xl border-brand-navy/25 text-base"
      onClick={toggleSaved}
      size="lg"
      variant="outline"
    >
      <Bookmark aria-hidden="true" className={saved ? "size-5 fill-current" : "size-5"} />
      {saved ? "Saved for later" : "Save for later"}
    </GeneralButton>
  );
}

export function FundingOpportunityCard({
  action,
  opportunity,
}: {
  action?: ReactNode;
  opportunity: PublicFundingCallSummary;
}) {
  const category = opportunity.thematicArea?.trim()
    || (/agricultur/i.test(opportunity.title) ? "Agriculture" : "Funding opportunity");
  const isAgriculture = /agricultur/i.test(category);
  const CategoryIcon = isAgriculture ? Sprout : FileText;
  const tags = [...new Set(
    [opportunity.fundingInstrument, opportunity.thematicArea]
      .filter((tag): tag is string => Boolean(tag?.trim())),
  )];

  return (
    <article className="rounded-2xl border border-brand-navy/15 bg-brand-white p-5 shadow-sm sm:p-7">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-8">
        <div className="min-w-0">
          <header className="flex items-center gap-4">
            <span className={
              isAgriculture
                ? "grid size-14 shrink-0 place-items-center rounded-2xl bg-brand-orange/10 text-brand-orange"
                : "grid size-14 shrink-0 place-items-center rounded-2xl bg-brand-blue/15 text-brand-navy"
            }>
              <CategoryIcon aria-hidden="true" className="size-7" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-brand-navy/60">
                {category}
              </p>
              <h2 className="mt-1 text-xl font-bold leading-tight text-brand-navy sm:text-2xl">
                {opportunity.title}
              </h2>
            </div>
          </header>

          <p className="mt-4 line-clamp-4 whitespace-pre-line text-sm leading-6 text-brand-navy/75 sm:text-base sm:leading-7">
            {opportunity.summary}
          </p>

          <dl className="mt-5 flex flex-wrap gap-x-7 gap-y-4 text-brand-navy">
            <div className="flex items-center gap-3">
              <Banknote aria-hidden="true" className="size-6 shrink-0" />
              <div>
                <dt className="text-xs text-brand-navy/65">Maximum funding</dt>
                <dd className="font-bold">
                  {"N$" + amountFormatter.format(opportunity.maximumAmount)}
                </dd>
              </div>
            </div>
            <div className="flex items-center gap-3 border-l border-brand-navy/10 pl-7">
              <CalendarDays aria-hidden="true" className="size-6 shrink-0" />
              <div>
                <dt className="text-xs text-brand-navy/65">
                  {opportunity.status === "upcoming" ? "Opening date" : "Closing date"}
                </dt>
                <dd className="font-bold">
                  {formatOpportunityDate(
                    opportunity.status === "upcoming"
                      ? opportunity.opensAt
                      : opportunity.closesAt,
                  )}
                </dd>
              </div>
            </div>
          </dl>

          {tags.length > 0 ? (
            <ul className="mt-5 flex flex-wrap gap-2" aria-label="Funding call categories">
              {tags.map((tag) => (
                <li
                  className="rounded-xl bg-brand-blue/15 px-3 py-1 text-xs font-medium text-brand-navy"
                  key={tag}
                >
                  {tag}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="flex flex-col justify-between gap-6 border-t border-brand-navy/10 pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <div className="flex flex-wrap gap-2">
            <StatusBadge
              className={
                opportunity.status === "open"
                  ? "gap-2 bg-brand-green/20 px-3 py-1.5 text-xs before:size-2 before:rounded-full before:bg-green-700"
                  : "gap-2 px-3 py-1.5 text-xs before:size-2 before:rounded-full before:bg-brand-navy"
              }
              status={opportunity.status}
            />
            <span
              aria-label={"Important date: " + opportunityDateLabel(opportunity)}
              className={
                opportunity.status === "open"
                  ? "inline-flex rounded-full bg-brand-green/20 px-3 py-1.5 text-xs font-semibold text-brand-navy"
                  : "inline-flex rounded-full bg-brand-cream px-3 py-1.5 text-xs font-semibold text-brand-navy"
              }
            >
              {opportunityDateLabel(opportunity)}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <GeneralButton asChild className="w-full rounded-xl text-base" size="lg">
              <Link href={"/portal/funding-opportunities/" + opportunity.id}>
                View details
                <ArrowRight aria-hidden="true" className="size-5" />
              </Link>
            </GeneralButton>
            {action ?? <SaveOpportunityButton id={opportunity.id} />}
          </div>
        </div>
      </div>
    </article>
  );
}
