import { ClipboardList, FileQuestion, Gavel, ScanSearch } from "lucide-react";

import type {
  AdminDashboardView,
} from "@/modules/dashboard/AdminDashboardTypes";
import { AdminDashboardCharts } from "./AdminDashboardCharts";
import { AdminDashboardPanels } from "./AdminDashboardPanels";
import { DashboardPeriodFilter } from "./DashboardPeriodFilter";

function MetricCard({
  description,
  icon: Icon,
  label,
  value,
}: {
  description: string;
  icon: typeof ClipboardList;
  label: string;
  value: number | null;
}) {
  return (
    <article className="rounded-2xl border border-brand-navy/10 bg-brand-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-3xl font-bold text-brand-navy">
            {value === null ? "—" : value.toLocaleString("en-NA")}
          </p>
          <h2 className="mt-2 text-sm font-bold text-brand-navy">{label}</h2>
        </div>
        <span className="grid size-10 place-items-center rounded-xl bg-brand-orange/10">
          <Icon aria-hidden="true" className="size-5 text-brand-orange" />
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-brand-navy/60">
        {description}
      </p>
    </article>
  );
}

function DashboardHeader({ dashboard }: { dashboard: AdminDashboardView }) {
  const limitedVisibility = dashboard.visibility !== "all";
  return (
    <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div>
        <h1 className="text-3xl font-bold text-brand-navy">Dashboard</h1>
        <p className="mt-1 text-sm text-brand-navy/65">
          Overview of submitted applications and active workflow work.
        </p>
        {limitedVisibility ? (
          <p className="mt-2 text-xs font-semibold text-brand-orange">
            {dashboard.visibility === "assigned"
              ? "Showing applications assigned to you or one of your roles."
              : "You do not have permission to view application metrics."}
          </p>
        ) : null}
      </div>
      <DashboardPeriodFilter period={dashboard.period} />
    </header>
  );
}

function DashboardMetrics({ dashboard }: { dashboard: AdminDashboardView }) {
  return (
    <section
      aria-label="Application metrics"
      className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      <MetricCard
        description="Submitted during the selected period"
        icon={ClipboardList}
        label="Total applications"
        value={dashboard.metrics.totalApplications}
      />
      <MetricCard
        description="Currently in a configured review stage"
        icon={ScanSearch}
        label="Under review"
        value={dashboard.metrics.underReview}
      />
      <MetricCard
        description="Request tracking is not available yet"
        icon={FileQuestion}
        label="Information requests"
        value={dashboard.metrics.informationRequests}
      />
      <MetricCard
        description="Applications with an active decision task"
        icon={Gavel}
        label="Pending decision"
        value={dashboard.metrics.pendingDecision}
      />
    </section>
  );
}

export function AdminDashboard({ dashboard }: { dashboard: AdminDashboardView }) {
  return (
    <div className="mx-auto max-w-[1240px]">
      <DashboardHeader dashboard={dashboard} />
      <DashboardMetrics dashboard={dashboard} />
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <AdminDashboardCharts
          statuses={dashboard.statuses}
          total={dashboard.metrics.totalApplications}
        />
        <AdminDashboardPanels activities={dashboard.activities} />
      </div>
    </div>
  );
}
