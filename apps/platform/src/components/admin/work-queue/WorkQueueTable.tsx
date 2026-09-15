"use client";

import Link from "next/link";
import { UserRound } from "lucide-react";

import { CapabilityGate } from "@/components/layout/capability-gate";
import { GeneralButton } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { capabilities } from "@/auth/authorization/capabilities";
import type { WorkQueueRow } from "@/modules/work-queue/WorkQueueTypes";

function formatDate(value: string | null) {
  if (!value) return "No due date";
  return new Intl.DateTimeFormat("en-NA", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function assignmentLabel(task: WorkQueueRow) {
  return task.assignedUserName ?? task.assignedRoleName ?? "Unassigned";
}

function queueColumns(
  claim: (task: WorkQueueRow) => void,
  claimingId: string | null,
): DataTableColumn<WorkQueueRow>[] {
  return [
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => row.original.priority
        ? <StatusBadge status={row.original.priority} />
        : <span className="text-brand-navy/50">Not set</span>,
    },
    {
      accessorKey: "reference",
      header: "Application",
      cell: ({ row }) => (
        <Link
          className="font-bold text-brand-navy hover:underline"
          href={`/admin/applications/${row.original.applicationId}`}
        >
          {row.original.reference}
        </Link>
      ),
    },
    {
      accessorKey: "businessName",
      header: "Applicant",
      cell: ({ row }) => (
        <div>
          <p className="font-semibold text-brand-navy">
            {row.original.businessName ?? "Business not selected"}
          </p>
          <p className="mt-1 text-[11px] text-brand-navy/55">
            {row.original.applicantName}
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
      accessorKey: "taskName",
      header: "Task",
    },
    {
      accessorKey: "dueAt",
      header: "Due date",
      cell: ({ row }) => formatDate(row.original.dueAt),
    },
    {
      accessorKey: "assignedUserName",
      header: "Assigned to",
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-2 whitespace-nowrap">
          <UserRound aria-hidden="true" className="size-4 text-brand-orange" />
          {assignmentLabel(row.original)}
        </span>
      ),
    },
    {
      id: "action",
      header: "Action",
      enableSorting: false,
      cell: ({ row }) => row.original.assignedUserId ? (
        <GeneralButton asChild size="sm" variant="outline">
          <Link href={`/admin/tasks/${row.original.taskInstanceId}`}>
            View
          </Link>
        </GeneralButton>
      ) : row.original.assignedRoleId ? (
        <CapabilityGate capability={capabilities.workflowTaskClaim}>
          <GeneralButton
            aria-busy={claimingId === row.original.taskInstanceId}
            disabled={claimingId !== null}
            onClick={() => claim(row.original)}
            size="sm"
            type="button"
          >
            {claimingId === row.original.taskInstanceId ? "Claiming…" : "Claim"}
          </GeneralButton>
        </CapabilityGate>
      ) : <span className="text-brand-navy/50">Unassigned</span>,
    },
  ];
}

export function WorkQueueTable({
  claimingId,
  emptyMessage,
  items,
  onClaim,
}: {
  claimingId: string | null;
  emptyMessage: string;
  items: WorkQueueRow[];
  onClaim: (task: WorkQueueRow) => void;
}) {
  return (
    <DataTable
      columns={queueColumns(onClaim, claimingId)}
      data={items}
      emptyMessage={emptyMessage}
      minWidth={1120}
    />
  );
}
