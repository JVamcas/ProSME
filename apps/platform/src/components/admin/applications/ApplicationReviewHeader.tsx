import { ArrowLeft, MapPin } from "lucide-react";
import Link from "next/link";

import { GeneralButton } from "@/components/ui/button";
import type { AdminApplicationOverview } from "@/modules/applications/ApplicationTypes";
import { StatusBadge } from "@/components/ui/status-badge";

export function ApplicationReviewHeader({
  application,
}: {
  application: AdminApplicationOverview;
}) {
  return (
    <header className="space-y-4">
      <Link
        href="/admin/applications"
        className="inline-flex items-center gap-2 text-sm font-semibold text-brand-navy/65 hover:text-brand-navy"
      >
        <ArrowLeft aria-hidden="true" className="size-4 text-brand-orange" />
        Back to applications
      </Link>
      <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-brand-navy">
            Application Overview
          </h1>
          <h2 className="mt-3 text-xl font-bold text-brand-navy">
            {application.businessName ?? "Business not selected"}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-brand-navy/60">
            <span className="inline-flex items-center gap-1.5">
              <MapPin aria-hidden="true" className="size-4 text-brand-orange" />
              {application.location ?? "Location not provided"}
            </span>
            <span className="rounded-full bg-brand-blue/20 px-3 py-1 font-semibold text-brand-navy">
              {application.industry ?? "Industry not provided"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-xs font-bold text-brand-navy/65">
            {application.reference}
          </span>
          <StatusBadge
            label={
              application.currentStageName ?? "Submitted"
            }
            status={application.currentStageName ?? "Submitted"}
          />
          <GeneralButton disabled variant="outline">
            View programme guideline
          </GeneralButton>
        </div>
      </div>
    </header>
  );
}

const tabs = [
  "Overview",
  "Applicant",
  "Documents",
  "Assessment",
  "Finance Review",
  "Recommendation",
  "Decision",
  "History",
] as const;

export function ApplicationReviewTabs() {
  return (
    <nav
      aria-label="Application sections"
      className="overflow-x-auto border-b border-brand-navy/10"
    >
      <div className="flex min-w-max gap-1">
        {tabs.map((tab, index) => (
          <button
            aria-current={index === 0 ? "page" : undefined}
            className={`border-b-2 px-3 py-3 text-sm font-semibold transition sm:px-4 ${
              index === 0
                ? "border-brand-orange text-brand-navy"
                : "border-transparent text-brand-navy/50 hover:border-brand-orange/40 hover:text-brand-navy"
            }`}
            disabled={index !== 0}
            key={tab}
            type="button"
          >
            {tab}
          </button>
        ))}
      </div>
    </nav>
  );
}
