"use client";
import { DataTable, type DataTableColumn } from "@/shared/ui/DataTable";
import type { WebsiteRegion } from "../../domain/WebsiteAnalyticsPanels";
import { analyticsPercent } from "./WebsiteAnalyticsFormatting";

const columns: DataTableColumn<WebsiteRegion>[] = [
  { accessorKey: "providerRegion", header: "Region" },
  { accessorKey: "users", header: "Users" },
  {
    accessorKey: "share",
    header: "Share",
    cell: ({ row }) => analyticsPercent(row.original.share),
  },
];
export function WebsiteVisitorRegionsTable({
  regions,
}: {
  regions: WebsiteRegion[];
}) {
  return (
    <DataTable
      columns={columns}
      data={regions}
      density="compact"
      minWidth={220}
    />
  );
}
