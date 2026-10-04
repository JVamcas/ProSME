"use client";

import { PageShell } from "@/shared/ui/PageShell";
import { QuerySection } from "@/shared/ui/QuerySection";
import { QueryRefreshButton } from "@/shared/ui/QueryRefreshButton";
import { usePortalContext } from "@/shared/ui/portal/capability-context";
import type { AdminDashboardPeriod } from "../AdminDashboardTypes";
import { AdminDashboardContent } from "./AdminDashboard";
import { ApplicantDashboardContent } from "./applicant/ApplicantDashboard";
import { DashboardPeriodFilter } from "./DashboardPeriodFilter";
import { DashboardSkeleton } from "./DashboardSkeleton";
import { useApplicantDashboard, useStaffDashboard } from "./useDashboard";

export function StaffDashboardPage({
  period,
}: {
  period: AdminDashboardPeriod;
}) {
  const query = useStaffDashboard(period);
  return (
    <PageShell
      title="Dashboard"
      description="Overview of submitted applications and active workflow work."
      actions={
        <div className="flex flex-wrap items-end gap-3">
          <DashboardPeriodFilter period={period} />
          <QueryRefreshButton
            refreshing={query.isFetching}
            onRefresh={() => void query.refetch()}
          />
        </div>
      }
    >
      <QuerySection
        query={query}
        loading={<DashboardSkeleton />}
        title="dashboard"
      >
        {(dashboard) => <AdminDashboardContent dashboard={dashboard} />}
      </QuerySection>
    </PageShell>
  );
}

export function ApplicantDashboardPage() {
  const query = useApplicantDashboard();
  const { displayName } = usePortalContext();
  return (
    <PageShell
      title={`Welcome back, ${displayName}`}
      description="Here's an overview of your SME Fund activity."
      variant="contained"
      actions={
        <QueryRefreshButton
          refreshing={query.isFetching}
          onRefresh={() => void query.refetch()}
        />
      }
    >
      <QuerySection
        query={query}
        loading={<DashboardSkeleton />}
        title="dashboard"
      >
        {(dashboard) => <ApplicantDashboardContent {...dashboard} />}
      </QuerySection>
    </PageShell>
  );
}
