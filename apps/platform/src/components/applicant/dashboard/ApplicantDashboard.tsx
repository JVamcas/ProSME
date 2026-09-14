import {
  BellRing,
  BriefcaseBusiness,
  CircleAlert,
  FileClock,
  Send,
} from "lucide-react";
import Image from "next/image";

import type { ApplicantDashboardSummary } from "@/modules/profiles/ProfileTypes";
import { DashboardMetricCard } from "./DashboardMetricCard";

export function ApplicantDashboard({
  displayName,
  openFundingOpportunityCount,
}: ApplicantDashboardSummary & { openFundingOpportunityCount: number }) {
  return (
    <div>
      <header className="grid min-h-32 overflow-hidden rounded-2xl border border-brand-blue/40 bg-brand-blue/15 shadow-sm sm:grid-cols-[1fr_15rem]">
        <div className="self-center p-5 sm:p-6">
          <h1 className="display text-2xl font-bold text-brand-navy sm:text-3xl">
            Welcome back, {displayName}
          </h1>
          <p className="mt-1 text-sm text-brand-navy/70">
            Here&apos;s an overview of your SME Fund activity.
          </p>
        </div>
        <div className="relative hidden min-h-32 sm:block">
          <Image
            alt=""
            aria-hidden="true"
            className="object-contain object-right"
            fill
            priority
            sizes="240px"
            src="/brand/pic1.png"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-blue/30 to-transparent" />
        </div>
      </header>

      <section aria-labelledby="application-status-heading" className="mt-6">
        <h2
          id="application-status-heading"
          className="text-lg font-bold text-brand-navy"
        >
          Application status
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <DashboardMetricCard
            icon={FileClock}
            label="Applications in progress"
            supportingText="No active applications"
            value="0"
          />
          <DashboardMetricCard
            icon={Send}
            label="Submitted"
            supportingText="You have not submitted any applications"
            value="0"
          />
          <DashboardMetricCard
            icon={CircleAlert}
            label="Action required"
            supportingText="Nothing needs attention"
            value="0"
          />
          <DashboardMetricCard
            href="/portal/funding-opportunities?status=open"
            icon={BriefcaseBusiness}
            label="Funding opportunities"
            supportingText={
              openFundingOpportunityCount === 1
                ? "1 open funding opportunity"
                : `${openFundingOpportunityCount} open funding opportunities`
            }
            value={String(openFundingOpportunityCount)}
          />
        </div>
      </section>

      <section
        aria-labelledby="recent-activity-heading"
        className="mt-6 min-h-48 rounded-2xl border border-brand-navy/15 bg-brand-white shadow-sm"
      >
        <div className="border-b border-brand-navy/10 px-5 py-4">
          <h2
            id="recent-activity-heading"
            className="font-bold text-brand-navy"
          >
            Recent activity
          </h2>
        </div>
        <div className="grid min-h-36 place-items-center px-5 py-8 text-center">
          <div>
            <BellRing
              aria-hidden="true"
              className="mx-auto size-7 text-brand-orange"
            />
            <p className="mt-3 font-bold text-brand-navy">
              No recent activity yet
            </p>
            <p className="mt-1 text-sm text-brand-navy/65">
              Application updates will appear here when they become available.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
