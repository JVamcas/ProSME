"use client";

import Link from "next/link";
import { Pagination } from "@/components/ui/pagination";
import { DataTable, type DataTableColumn } from "@/shared/ui/DataTable";
import type { WebsiteReportHistory } from "../../ClientWebsiteReportService";
import type { WebsiteReportSummary } from "../../domain/WebsiteReport";

const columns: DataTableColumn<WebsiteReportSummary>[] = [
  {
    id: "period",
    header: "Period",
    enableSorting: false,
    cell: ({ row }) => (
      <Link
        className="font-semibold text-brand-navy underline"
        href={`/admin/reports/website/${row.original.id}`}
      >
        {row.original.startDate} – {row.original.endDate}
      </Link>
    ),
  },
  { accessorKey: "frequency", header: "Frequency", enableSorting: false },
  { accessorKey: "state", header: "Generation", enableSorting: false },
  {
    id: "delivery",
    header: "Email delivery",
    enableSorting: false,
    cell: ({ row }) => row.original.deliveryState ?? "Waiting for generation",
  },
  { accessorKey: "note", header: "Notes", enableSorting: false },
];

export function WebsiteReportHistoryTable({
  history,
  page,
  refreshing,
  onPrevious,
  onNext,
}: {
  history: WebsiteReportHistory;
  page: number;
  refreshing: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const total = history.total;

  return (
    <DataTable
      columns={columns}
      data={history.rows}
      rowKey={(report) => report.id}
      emptyMessage="No reports have been generated for this view."
      toolbar={{
        title: "Report history",
        description: `${total} saved or pending reports`,
      }}
      footer={
        <Pagination
          page={page}
          pageSize={20}
          total={total}
          hasNextPage={page * 20 < total}
          disabled={refreshing}
          onPrevious={onPrevious}
          onNext={onNext}
        />
      }
    />
  );
}
