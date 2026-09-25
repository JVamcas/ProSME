import { ClipboardList, FileQuestion, Gavel, ScanSearch } from "lucide-react";

import type { AdminDashboardView } from "@/modules/dashboard/AdminDashboardTypes";
import { DashboardMetricCard } from "@/modules/dashboard/ui/DashboardMetricCard";
import { PageShell } from "@/shared/ui/PageShell";
import { AdminDashboardCharts } from "./AdminDashboardCharts";
import { AdminDashboardPanels } from "./AdminDashboardPanels";
import { DashboardPeriodFilter } from "./DashboardPeriodFilter";

function DashboardMetrics({ dashboard }: { dashboard: AdminDashboardView }) {
  return (
    <section
      aria-label="Application metrics"
      className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      <DashboardMetricCard
        supportingText="Submitted during the selected period"
        icon={ClipboardList}
        label="Total applications"
        value={dashboard.metrics.totalApplications.toLocaleString("en-NA")}
      />
      <DashboardMetricCard
        supportingText="Currently in a configured review stage"
        icon={ScanSearch}
        label="Under review"
        value={dashboard.metrics.underReview.toLocaleString("en-NA")}
      />
      <DashboardMetricCard
        supportingText="Request tracking is not available yet"
        icon={FileQuestion}
        label="Information requests"
        value={
          dashboard.metrics.informationRequests === null
            ? "—"
            : dashboard.metrics.informationRequests.toLocaleString("en-NA")
        }
      />
      <DashboardMetricCard
        supportingText="Applications with an active decision task"
        icon={Gavel}
        label="Pending decision"
        value={dashboard.metrics.pendingDecision.toLocaleString("en-NA")}
      />
    </section>
  );
}

export function AdminDashboard({ dashboard }: { dashboard: AdminDashboardView }) {
  const limitedVisibility = dashboard.visibility !== "all";

  return (
    <PageShell
      actions={<DashboardPeriodFilter period={dashboard.period} />}
      description="Overview of submitted applications and active workflow work."
      title="Dashboard"
    >
      <div>
        {limitedVisibility ? (
          <p className="text-xs font-semibold text-brand-orange">
            {dashboard.visibility === "assigned"
              ? "Showing applications assigned to you or one of your roles."
              : "You do not have permission to view application metrics."}
          </p>
        ) : null}
        <DashboardMetrics dashboard={dashboard} />
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <AdminDashboardCharts
            statuses={dashboard.statuses}
            total={dashboard.metrics.totalApplications}
          />
          <AdminDashboardPanels activities={dashboard.activities} />
        </div>
      </div>
    </PageShell>
  );
}
