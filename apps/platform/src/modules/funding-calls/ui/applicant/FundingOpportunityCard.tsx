"use client";

import {
  ArrowRight,
  Banknote,
  Bookmark,
  CalendarDays,
  FileText,
  Sprout,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSyncExternalStore, type ReactNode } from "react";

import { GeneralButton } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import type { PublicFundingCallSummary } from "@/modules/funding-calls/api/PublicFundingCallTransport";
import {
  formatOpportunityDate
} from "@/modules/funding-calls/ui/FundingOpportunityFormat";
import { SanitizedRichTextContent } from "@/shared/ui/SanitizedRichTextContent";

const savedStorageKey = "sme-fund-saved-opportunities";
const savedChangeEvent = "sme-fund-saved-opportunities-changed";

const amountFormatter = new Intl.NumberFormat("en-NA", {
  maximumFractionDigits: 0,
});

function savedOpportunityIds(): string[] {
  try {
    const stored = JSON.parse(
      window.localStorage.getItem(savedStorageKey) ?? "[]",
    );

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
      // Storage may be unavailable.
    }
  }

  return (
    <GeneralButton
      aria-label={saved ? "Remove from saved" : "Save for later"}
      aria-pressed={saved}
      className="size-10 shrink-0 rounded-lg border-brand-navy/15 p-0"
      onClick={toggleSaved}
      size="icon"
      variant="outline"
    >
      <Bookmark
        aria-hidden="true"
        className={saved ? "size-4 fill-current" : "size-4"}
      />
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
  const category =
    opportunity.thematicArea?.trim() ||
    (/agricultur/i.test(opportunity.title)
      ? "Agriculture"
      : "Funding opportunity");

  const isAgriculture = /agricultur/i.test(category);
  const CategoryIcon = isAgriculture ? Sprout : FileText;

  const tags = [
    ...new Set(
      [opportunity.fundingInstrument, opportunity.thematicArea].filter(
        (tag): tag is string => Boolean(tag?.trim()),
      ),
    ),
  ];

  const importantDate =
    opportunity.status === "upcoming"
      ? opportunity.opensAt
      : opportunity.closesAt;

  return (
    <article className="overflow-hidden rounded-xl border border-brand-navy/10 bg-brand-white shadow-sm transition hover:border-brand-orange/25 hover:shadow-md">
      <div className="flex flex-col sm:flex-row">
        {opportunity.thumbnailUrl ? (
          <div className="relative h-36 w-full shrink-0 bg-brand-cream sm:h-auto sm:w-44 lg:w-52">
            <Image
              alt=""
              className="object-cover"
              fill
              sizes="(min-width: 1024px) 208px, (min-width: 640px) 176px, 100vw"
              src={opportunity.thumbnailUrl}
              unoptimized
            />
          </div>
        ) : null}

        <div className="min-w-0 flex-1 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span
                  className={
                    isAgriculture
                      ? "inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-orange"
                      : "inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-navy/60"
                  }
                >
                  <CategoryIcon aria-hidden="true" className="size-3.5" />
                  {category}
                </span>

                <span
                  aria-hidden="true"
                  className="size-1 rounded-full bg-brand-navy/25"
                />

                <StatusBadge
                  className={
                    opportunity.status === "open"
                      ? "gap-1.5 bg-brand-green/15 px-2 py-0.5 text-[11px] before:size-1.5 before:rounded-full before:bg-green-700"
                      : "gap-1.5 px-2 py-0.5 text-[11px] before:size-1.5 before:rounded-full before:bg-brand-navy"
                  }
                  status={opportunity.status}
                />
              </div>

              <h2 className="truncate text-lg font-bold text-brand-navy sm:text-xl">
                {opportunity.title}
              </h2>
            </div>

            <div className="hidden shrink-0 items-center gap-2 sm:flex">
              {action ?? <SaveOpportunityButton id={opportunity.id} />}

              <GeneralButton
                asChild
                className="rounded-lg px-4"
                size="sm"
              >
                <Link href={`/portal/funding-opportunities/${opportunity.id}`}>
                  View details
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </GeneralButton>
            </div>
          </div>

          <SanitizedRichTextContent
            className="mt-2 line-clamp-2 max-w-4xl text-sm leading-5 text-brand-navy/65"
            sanitizedHtml={opportunity.summary}
          />

          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex items-center gap-2">
              <Banknote
                aria-hidden="true"
                className="size-4 text-brand-navy/55"
              />

              <div className="flex items-baseline gap-1.5">
                <span className="text-xs text-brand-navy/55">
                  Maximum funding
                </span>
                <span className="text-sm font-bold text-brand-navy">
                  N${amountFormatter.format(opportunity.maximumAmount)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <CalendarDays
                aria-hidden="true"
                className="size-4 text-brand-navy/55"
              />

              <div className="flex items-baseline gap-1.5">
                <span className="text-xs text-brand-navy/55">
                  {opportunity.status === "upcoming"
                    ? "Opens"
                    : "Closes"}
                </span>

                <span className="text-sm font-bold text-brand-navy">
                  {formatOpportunityDate(importantDate)}
                </span>
              </div>
            </div>

            {tags.length > 0 ? (
              <ul
                aria-label="Funding call categories"
                className="flex flex-wrap gap-1.5"
              >
                {tags.map((tag) => (
                  <li
                    className="rounded-full bg-brand-blue/10 px-2.5 py-1 text-[11px] font-medium text-brand-navy"
                    key={tag}
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="mt-4 flex gap-2 sm:hidden">
            <GeneralButton
              asChild
              className="flex-1 rounded-lg"
              size="sm"
            >
              <Link href={`/portal/funding-opportunities/${opportunity.id}`}>
                View details
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </GeneralButton>

            {action ?? <SaveOpportunityButton id={opportunity.id} />}
          </div>
        </div>
      </div>
    </article>
  );
}