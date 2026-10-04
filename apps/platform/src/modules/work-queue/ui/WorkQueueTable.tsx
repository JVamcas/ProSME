"use client";

import { WorkflowTaskHoldStatus } from "@/modules/workflows/ui/tasks/WorkflowTaskHoldStatus";
import { WorkflowRfiTaskStatus } from "@/modules/workflows/ui/rfi/WorkflowRfiTaskStatus";
import { LockKeyhole, UserRound } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/shared/ui/DataTable";
import { ArrowLink } from "@/components/ui/links";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatLocalDateTime24 } from "@/lib/dateUtils";
import type { WorkQueueRow } from "../WorkQueueTypes";
import { workflowTaskTypeLabels } from "@/modules/workflows/ui/WorkflowTaskTypeLabels";

const columns: DataTableColumn<WorkQueueRow>[] = [
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
    accessorKey: "fundingCallTitle",
    header: "Funding call",
    cell: ({ row }) => row.original.fundingCallTitle ?? "—",
  },
  {
    accessorKey: "taskName",
    header: "Task",
    cell: ({ row }) => {
      const blockedReason = row.original.taskBlockedReason;
      if (!blockedReason || row.original.informationRequest || row.original.processingStatus === "ON_HOLD") {
        return (
          <div className="flex flex-col gap-2">
            <ArrowLink
              href={`/admin/applications/${row.original.applicationId}?tab=workflow-progress&taskId=${row.original.taskInstanceId}`}
            >
              {row.original.taskName}
            </ArrowLink>
            <p className="text-xs text-brand-navy/50">
              Stage: {row.original.stageName}
            </p>
          </div>
        );
      }
      return (
        <div className="max-w-72 flex flex-col gap-2">
          <span
            aria-disabled="true"
            className="inline-flex items-center gap-2 text-sm font-bold text-brand-navy/45"
          >
            <LockKeyhole aria-hidden="true" className="size-4 shrink-0" />
            {row.original.taskName}
          </span>
          <p className="text-xs text-brand-navy/50">
            Stage: {row.original.stageName}
          </p>
        </div>
      );
    },
  },
  {
    accessorKey: "taskType",
    header: "Task type",
    cell: ({ row }) => (
      <StatusBadge
        className={
          row.original.taskType === "STAGE_DECISION"
            ? "bg-brand-blue/20"
            : "bg-brand-gold/30"
        }
        label={workflowTaskTypeLabels[row.original.taskType]}
        status={row.original.taskType}
      />
    ),
  },
  {
    accessorKey: "taskStatus",
    header: "Task status",
    cell: ({ row }) => (
      <div className="max-w-72 space-y-2">
        <StatusBadge status={row.original.processingStatus ?? row.original.taskStatus} />
        {row.original.taskBlockedReason ? (
          <p className="text-xs leading-4 text-brand-navy/65">
            {row.original.taskBlockedReason}
          </p>
        ) : null}
        {row.original.holds?.length ? <WorkflowTaskHoldStatus holds={row.original.holds} /> : null}
        {row.original.informationRequest ? (
          <WorkflowRfiTaskStatus request={row.original.informationRequest} />
        ) : null}
      </div>
    ),
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
  },
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
      minWidth={1280}
    />
  );
}
