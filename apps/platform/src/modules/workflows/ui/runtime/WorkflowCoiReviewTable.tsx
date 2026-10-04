"use client";

import { ArrowRight, UserRound } from "lucide-react";

import { GeneralButton } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/shared/ui/DataTable";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatLocalDateTime24 } from "@/lib/dateUtils";
import type { WorkflowCoiReviewRow } from "../../api/WorkflowCoiReviewTypes";
import { PreviewButton } from "@/components/ui/action-buttons";

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
      accessorKey: "stageName",
      header: "Stage",
      cell: ({ row }) => <StatusBadge status={row.original.stageName} />,
    },
    {
      accessorKey: "taskName",
      header: "Triggered by Task",
      cell: ({ row }) => (
        <div>
          <p className="font-semibold text-brand-navy">
            {row.original.taskName}
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
      accessorKey: "submittedAt",
      header: "Submitted",
      cell: ({ row }) => formatLocalDateTime24(row.original.submittedAt),
    },
    {
      id: "actions",
      header: "Action",
      enableSorting: false,
      cell: ({ row }) => (
        <PreviewButton
          onClick={() => onReview(row.original.taskId)}
          title="Review conflict of interest disclosure."
        />
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
