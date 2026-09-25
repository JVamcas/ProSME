"use client";

import { UserRound } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ArrowLink } from "@/components/ui/links";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatLocalDateTime24 } from "@/lib/dateUtils";
import type { WorkQueueRow } from "../WorkQueueTypes";

const columns: DataTableColumn<WorkQueueRow>[] = [
  {
    accessorKey: "taskName",
    header: "Task",
    cell: ({ row }) => (
      <ArrowLink href={`/admin/tasks/${row.original.taskInstanceId}`}>
        {row.original.taskName}
      </ArrowLink>
    ),
  },
  {
    accessorKey: "businessName",
    header: "Applicant",
    cell: ({ row }) => (
      <div>
        <p className="font-semibold text-brand-navy">
          {row.original.applicantName}
        </p>
        <p className="mt-1 text-[11px] text-brand-navy/55">
          {row.original.businessName ?? "—"}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "stageName",
    header: "Stage",
    cell: ({ row }) => <StatusBadge status={row.original.stageName} />,
  },
  {
    accessorKey: "assignedUserName",
    header: "Assigned to",
    cell: ({ row }) => (
      <span className="inline-flex items-center gap-2 whitespace-nowrap">
        <UserRound aria-hidden="true" className="size-4 text-brand-orange" />
        {row.original.assignedUserName ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Task created",
    cell: ({ row }) => formatLocalDateTime24(row.original.createdAt),
  }
];

export function WorkQueueTable({
  emptyMessage,
  items,
}: {
  emptyMessage: string;
  items: WorkQueueRow[];
}) {
  return (
    <DataTable
      columns={columns}
      data={items}
      emptyMessage={emptyMessage}
      minWidth={1120}
    />
  );
}
