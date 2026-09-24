"use client";

import {
  Building2,
  CalendarDays,
  CircleHelp,
  Clock3,
  Download,
  FileText,
  Hash,
  MapPin,
  Percent,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { GeneralButton, GeneralButtonLink } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Badge } from "@/shared/ui/Badge";
import { formatLocalDateTimeSeconds24 } from "@/lib/dateUtils";
import { PageShell } from "@/shared/ui/PageShell";
import {
  ApplicationDocumentsPanel,
  ApplicationSectionSummary,
  ApplicationSubmittedDetails,
} from "./ApplicationOverviewPanels";
import type { ApplicationDetailModel } from "./ApplicationDetailTypes";

const factIcons = {
  "Business name": Building2,
  "Business Entity": Building2,
  "Funding opportunity": FileText,
  "Application reference": Hash,
  "Form completion": Percent,
  "Amount requested": Wallet,
  "Project location": MapPin,
  "Submission date": CalendarDays,
} as const;

function StatusBanner({ model }: { model: ApplicationDetailModel }) {
  return (
    <section className="grid gap-4 rounded-lg border border-brand-orange/25 bg-gradient-to-r from-brand-cream via-white to-brand-cream px-4 py-3 sm:grid-cols-[minmax(0,1fr)_250px] sm:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-orange text-white">
          <Clock3 aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold leading-tight text-brand-navy">
              {model.statusLabel}
            </h2>
            <Badge
              className="rounded px-2 py-0.5 text-[10px] tracking-wide"
              size="sm"
              variant="subtle"
            >
              {model.statusBadgeLabel}
            </Badge>
          </div>
          <p className="mt-1 text-xs leading-4 text-brand-navy/70">
            {model.statusDescription}
          </p>
        </div>
      </div>
      <dl className="grid gap-1 border-t border-brand-orange/20 pt-3 text-[11px] sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
        <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-2">
          <dt className="text-brand-navy/60">Submitted:</dt>
          <dd className="font-medium text-brand-navy/80">
            {model.submittedAt
              ? formatLocalDateTimeSeconds24(model.submittedAt)
              : "Not submitted"}
          </dd>
        </div>
        {model.updatedAt ? (
          <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-2">
            <dt className="text-brand-navy/60">Last updated:</dt>
            <dd className="font-medium text-brand-navy/80">
              {formatLocalDateTimeSeconds24(model.updatedAt)}
            </dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}

function FactCard({ label, value }: ApplicationDetailModel["facts"][number]) {
  const Icon = factIcons[label as keyof typeof factIcons] ?? FileText;

  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg border border-brand-navy/10 p-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-navy/5 text-brand-navy">
        <Icon aria-hidden="true" className="size-4" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-brand-navy/60">{label}</dt>
        <dd className="break-words text-sm font-semibold text-brand-navy">
          {value}
        </dd>
      </div>
    </div>
  );
}

export function ApplicationDetailView({
  actions,
  history,
  model,
  showSupport = false,
}: {
  actions?: ReactNode;
  history?: ReactNode;
  model: ApplicationDetailModel;
  showSupport?: boolean;
}) {
  return (
    <PageShell
      backLink={
        <Link
          className="text-sm font-semibold text-brand-orange hover:underline"
          href={model.backHref}
        >
          ← {model.backLabel}
        </Link>
      }
      description={`Reference: ${model.reference ?? "Assigned on submission"}`}
      title={model.title}
    >
      <div className="space-y-4">
        <StatusBanner model={model} />
        <div className="grid items-start gap-4">
          <Tabs
            accent="orange"
            ariaLabel="Application detail sections"
            defaultSelectedId="overview"
            items={[
              {
                content: (
                  <div className="space-y-4">
                    <ApplicationSectionSummary sections={model.sections} />
                  </div>
                ),
                id: "overview",
                label: "Overview",
              },
              {
                content: (
                  <ApplicationDocumentsPanel documents={model.documents} />
                ),
                id: "documents",
                label: `Documents (${model.documents.length})`,
              },
            ]}
            leadingContent={
              <div className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-bold text-brand-navy">
                    Application overview
                  </h2>
                  <div className="flex flex-wrap items-center gap-2">
                    {model.submittedAt ? (
                      <GeneralButton
                        disabled
                        size="compact"
                        title="The submitted application PDF is not available yet."
                        variant="outline"
                      >
                        <Download aria-hidden="true" className="size-4" />
                        Download PDF
                      </GeneralButton>
                    ) : null}
                    {actions}
                  </div>
                </div>
                <dl className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {model.facts.map((fact) => (
                    <FactCard key={fact.label} {...fact} />
                  ))}
                </dl>
              </div>
            }
            listClassName="rounded-xl border border-brand-navy/10 shadow-sm"
            panelClassName="mt-4"
            tabListClassName="border-t border-brand-navy/10 px-4"
          />
        </div>
      </div>
    </PageShell>
  );
}
