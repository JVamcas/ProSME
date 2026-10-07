"use client";
import { DataTable, type DataTableColumn } from "@/shared/ui/DataTable";
import type {
  BoundedWebsiteRows,
  WebsiteCallEngagement,
} from "../../domain/WebsiteAnalyticsPanels";

export function WebsiteFundingCallEngagement({
  data,
  calls,
}: {
  data: BoundedWebsiteRows<WebsiteCallEngagement>;
  calls: { id: string; title: string }[];
}) {
  const columns: DataTableColumn<WebsiteCallEngagement>[] = [
    {
      accessorKey: "fundingCallId",
      header: "Call",
      cell: ({ row }) =>
        calls.find((call) => call.id === row.original.fundingCallId)?.title ??
        row.original.fundingCallId,
    },
    {
      accessorKey: "event",
      header: "Step",
      cell: ({ row }) =>
        ({
          funding_call_view: "Viewed",
          application_start: "Started",
          application_submit: "Submitted",
        })[row.original.event as "funding_call_view"] ?? "Unknown",
    },
    { accessorKey: "users", header: "Tracked users" },
  ];
  return (
    <DataTable
      columns={columns}
      data={data.rows}
      density="compact"
      minWidth={220}
      footer={
        data.truncated
          ? "Top 100 call/event rows; additional rows are omitted."
          : undefined
      }
    />
  );
}
