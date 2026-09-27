"use client";

import { ArrowRight, UserRound } from "lucide-react";

import { GeneralButton } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatLocalDateTime24 } from "@/lib/dateUtils";
import type { WorkflowCoiReviewRow } from "../../api/WorkflowCoiReviewTypes";

export function WorkflowCoiReviewTable({
  emptyMessage,
  items,
  onReview,
}: {
  emptyMessage: string;
  items: WorkflowCoiReviewRow[];
  onReview: (taskId: string) => void;
}) {
  const columns: DataTableColumn<WorkflowCoiReviewRow>[] = [
    {
      accessorKey: "taskName",
      header: "Review",
      cell: ({ row }) => (
        <div>
          <p className="font-semibold text-brand-navy">
            {row.original.taskName}
          </p>
          <p className="mt-1 text-xs text-brand-navy/55">
            {row.original.applicationReference}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "assignedUserName",
      header: "Disclosed by",
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-2">
          <UserRound aria-hidden="true" className="size-4 text-brand-orange" />
          {row.original.assignedUserName}
        </span>
      ),
    },
    {
      accessorKey: "stageName",
      header: "Stage",
      cell: ({ row }) => <StatusBadge status={row.original.stageName} />,
    },
    {
      accessorKey: "submittedAt",
      header: "Submitted",
      cell: ({ row }) => formatLocalDateTime24(row.original.submittedAt),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <GeneralButton
          onClick={() => onReview(row.original.taskId)}
          size="compact"
          type="button"
          variant="ghost"
        >
          Review
          <ArrowRight aria-hidden="true" className="size-4" />
        </GeneralButton>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={items}
      emptyMessage={emptyMessage}
      minWidth={880}
      rowKey={(item) => item.taskId}
    />
  );
}
