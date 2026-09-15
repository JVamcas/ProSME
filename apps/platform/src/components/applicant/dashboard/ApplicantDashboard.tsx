import {
  BriefcaseBusiness,
  CircleAlert,
  FileClock,
  Send,
} from "lucide-react";

import type {
  ApplicantDashboardMetrics,
  ApplicantDashboardView,
} from "@/modules/dashboard/ApplicantDashboardTypes";
import { ApplicantRecentActivity } from "./ApplicantRecentActivity";
import { DashboardMetricCard } from "./DashboardMetricCard";

function countDescription(
  count: number,
  singular: string,
  plural: string,
  emptyText?: string,
) {
  if (count === 0 && emptyText) return emptyText;
  return `${count} ${count === 1 ? singular : plural}`;
}

function ApplicationStatusMetrics({
  metrics,
}: {
  metrics: ApplicantDashboardMetrics;
}) {
  return (
    <section aria-labelledby="application-status-heading" className="mt-6">
      <h2
        id="application-status-heading"
        className="text-lg font-bold text-brand-navy"
      >
        Application status
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <DashboardMetricCard
          href="/portal/applications"
          icon={FileClock}
          label="Applications in progress"
          supportingText={
            countDescription(
              metrics.applicationsInProgress,
              "active application",
              "active applications",
              "No active applications",
            )
          }
          value={String(metrics.applicationsInProgress)}
        />
        <DashboardMetricCard
          href="/portal/applications"
          icon={Send}
          label="Submitted"
          supportingText={
            countDescription(
              metrics.submittedApplications,
              "submitted application",
              "submitted applications",
              "You have not submitted any applications",
            )
          }
          value={String(metrics.submittedApplications)}
        />
        <DashboardMetricCard
          href="/portal/applications"
          icon={CircleAlert}
          label="Action required"
          supportingText={
            countDescription(
              metrics.actionRequired,
              "application needs attention",
              "applications need attention",
              "Nothing needs attention",
            )
          }
          value={String(metrics.actionRequired)}
        />
        <DashboardMetricCard
          href="/portal/funding-opportunities?status=open"
          icon={BriefcaseBusiness}
          label="Funding opportunities"
          supportingText={
            countDescription(
              metrics.openFundingOpportunities,
              "open funding opportunity",
              "open funding opportunities",
            )
          }
          value={String(metrics.openFundingOpportunities)}
        />
      </div>
    </section>
  );
}

export function ApplicantDashboard({
  activities,
  displayName,
  metrics,
}: ApplicantDashboardView) {
  return (
    <div>
      <header className="grid min-h-32 overflow-hidden rounded-2xl border border-brand-blue/10 bg-brand-blue/10 shadow-sm sm:grid-cols-[1fr_15rem]">
        <div className="self-center p-5 sm:p-6">
          <h1 className="display text-2xl font-bold text-brand-navy sm:text-3xl">
            Welcome back, {displayName}
          </h1>
          <p className="mt-1 text-sm text-brand-navy/70">
            Here&apos;s an overview of your SME Fund activity.
          </p>
        </div>
      </header>

      <ApplicationStatusMetrics metrics={metrics} />

      <ApplicantRecentActivity activities={activities} />
    </div>
  );
}
