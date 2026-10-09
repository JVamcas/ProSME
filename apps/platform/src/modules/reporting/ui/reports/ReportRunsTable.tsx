"use client";
import type { ReactNode } from "react";
import { DataTable, type DataTableColumn } from "@/shared/ui/DataTable";
import { GeneralButton } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { Badge } from "@/shared/ui/Badge";
import { QuerySection } from "@/shared/ui/QuerySection";
import { Skeleton } from "@/shared/ui/Skeleton";
import type { ReportRunSummary } from "../../domain/Report";
import { useReportCatalogueFilters } from "../useReportCatalogueFilters";
import { useReportRuns } from "./useReports";
import { formatLocalDateTime24 } from "@/lib/dateUtils";
import { StatusBadge } from "@/components/ui/status-badge";

export function ReportRunsTable({
  reportId,
  onSelect,
  actions,
}: {
  reportId: string;
  onSelect: (id: string) => void;
  actions?: ReactNode;
}) {
  const filters = useReportCatalogueFilters();
  const query = useReportRuns(reportId, filters.input);
  const columns: DataTableColumn<ReportRunSummary>[] = [
    {
      accessorKey: "createdAt",
      header: "Datetime",
      cell: ({ row }) => formatLocalDateTime24(row.original.createdAt),
    },
    {
      accessorKey: "actorName",
      header: "User trigger",
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <span className="font-medium">{row.original.actorName}</span>
          <span className="text-xs text-slate-500">
            {row.original.actorEmail}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <Badge>{row.original.status}</Badge>,
    },
    {
      accessorKey: "rows",
      header: "Rows",
      cell: ({ row }) => row.original.rows ?? 0,
    },
    {
      id: "duration",
      header: "Duration",
      cell: ({ row }) => {
        const { startedAt, finishedAt } = row.original;
        if (!startedAt || !finishedAt) return "—";
        const seconds = Math.max(
          0,
          Math.round((Date.parse(finishedAt) - Date.parse(startedAt)) / 1000),
        );
        return `${seconds}s`;
      },
    },
    {
      id: "detail",
      header: "Files / details",
      cell: ({ row }) => (
        <GeneralButton
          type="button"
          variant="ghost"
          onClick={() => onSelect(row.original.id)}
        >
          Open run
        </GeneralButton>
      ),
    },
  ];
  return (
    <QuerySection
      query={query}
      title="runs"
      loading={<Skeleton className="h-80" />}
    >
      {(data) => (
        <DataTable
          columns={columns.map((column) => ({
            ...column,
            enableSorting: false,
          }))}
          data={data.items}
          rowKey={(item) => item.id}
          viewportHeight={420}
          toolbar={{ title: "Runs", actions }}
          footer={
            <Pagination
              page={data.page}
              pageSize={data.pageSize}
              total={data.total}
              hasNextPage={data.page * data.pageSize < data.total}
              onNext={filters.next}
              onPrevious={filters.previous}
            />
          }
        />
      )}
    </QuerySection>
  );
}
