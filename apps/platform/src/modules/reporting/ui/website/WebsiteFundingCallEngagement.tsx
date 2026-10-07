"use client";

import { DataTable, type DataTableColumn } from "@/shared/ui/DataTable";
import type {
  BoundedWebsiteRows,
  WebsiteCallEngagement,
} from "../../domain/WebsiteAnalyticsPanels";
import { analyticsCount } from "./WebsiteAnalyticsFormatting";

type CallRow = {
  id: string;
  title: string;
  views: number | null;
  applications: number | null;
};

export function fundingCallEngagementRows(
  data: BoundedWebsiteRows<WebsiteCallEngagement>,
  calls: { id: string; title: string }[],
): CallRow[] {
  const titles = new Map(calls.map((call) => [call.id, call.title]));
  const rows = new Map<string, CallRow>();
  const completeCounts =
    !data.truncated &&
    data.rows.every((row) => row.events !== undefined);
  for (const event of data.rows) {
    let row = rows.get(event.fundingCallId);
    if (!row) {
      row = {
        id: event.fundingCallId,
        title: titles.get(event.fundingCallId) ??
          (event.fundingCallId === "(not set)" ? "Unattributed call" : event.fundingCallId),
        views: completeCounts ? 0 : null,
        applications: completeCounts ? 0 : null,
      };
      rows.set(event.fundingCallId, row);
    }
    if (event.event === "funding_call_view") {
      row.views = event.events ?? null;
    }
    if (event.event === "application_submit") {
      row.applications = event.events ?? null;
    }
  }
  return [...rows.values()].sort((left, right) =>
    (right.views ?? -1) - (left.views ?? -1) ||
    left.title.localeCompare(right.title),
  );
}

const columns: DataTableColumn<CallRow>[] = [
  { accessorKey: "title", header: "Funding call" },
  {
    accessorKey: "views",
    header: "Views",
    cell: ({ row }) => row.original.views === null
      ? "—"
      : analyticsCount(row.original.views),
  },
  {
    accessorKey: "applications",
    header: "Applications",
    cell: ({ row }) => row.original.applications === null
      ? "—"
      : analyticsCount(row.original.applications),
  },
];

export function WebsiteFundingCallEngagement({
  data,
  calls,
}: {
  data: BoundedWebsiteRows<WebsiteCallEngagement>;
  calls: { id: string; title: string }[];
}) {
  return (
    <DataTable
      columns={columns}
      data={fundingCallEngagementRows(data, calls)}
      density="compact"
      minWidth={300}
      viewportHeight={240}
      rowKey={(row) => row.id}
      emptyMessage="No funding call engagement recorded"
    />
  );
}
