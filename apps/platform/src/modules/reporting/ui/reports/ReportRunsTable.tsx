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
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleString(),
    },
    { accessorKey: "actorId", header: "User trigger" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <Badge>{row.original.status}</Badge>,
    },
    { accessorKey: "rows", header: "Rows" },
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
