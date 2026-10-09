"use client";
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
}: {
  reportId: string;
  onSelect: (id: string) => void;
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
      cell: ({ row }) =>
        row.original.startedAt && row.original.finishedAt
          ? `${Math.max(0, Math.round((Date.parse(row.original.finishedAt) - Date.parse(row.original.startedAt)) / 1000))}s`
          : "—",
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
