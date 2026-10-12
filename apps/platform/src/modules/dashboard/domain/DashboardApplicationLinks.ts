import type { AdminApplicationStatusFilter } from "@/modules/applications/ApplicationTypes";
import type { AdminDashboardView } from "../AdminDashboardTypes";

function namibiaDate(timestamp: string) {
  return new Date(new Date(timestamp).valueOf() + 2 * 60 * 60 * 1000)
    .toISOString().slice(0, 10);
}

export function dashboardApplicationHref(
  dashboard: AdminDashboardView,
  status: AdminApplicationStatusFilter,
) {
  const query = new URLSearchParams({ status });
  const window = dashboard.submissionWindow;
  if (window?.from) {
    query.set("submittedAfter", window.from);
    query.set("submittedFrom", namibiaDate(window.from));
  }
  if (window?.to) {
    query.set("submittedBefore", window.to);
    query.set("submittedTo", namibiaDate(window.to));
  }
  return `/admin/applications?${query}`;
}
