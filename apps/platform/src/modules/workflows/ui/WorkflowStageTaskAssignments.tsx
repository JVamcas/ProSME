"use client";

import Link from "next/link";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatLocalDateTime24 } from "@/lib/dateUtils";
import type { WorkflowProgressTask } from "../api/WorkflowProgressTypes";

function Assignment({ task }: { task: WorkflowProgressTask }) {
  const name = task.assignedUserName ?? task.assignedRoleName ?? "Unassigned";

  const showRole =
    task.assignedUserName &&
    task.assignedRoleName &&
    task.assignedUserName !== task.assignedRoleName;

  return (
    <div>
      <p className="font-medium text-brand-navy">{name}</p>

      {task.assignedUserEmail ? (
        <p className="mt-0.5 text-xs text-brand-navy/55">
          {task.assignedUserEmail}
        </p>
      ) : null}

      {showRole ? (
        <p className="mt-0.5 text-xs text-brand-navy/55">
          {task.assignedRoleName}
        </p>
      ) : null}
    </div>
  );
}

const columns: DataTableColumn<WorkflowProgressTask>[] = [
  {
    accessorKey: "name",
    header: "Action required",
    cell: ({ row }) => (
      <span className="font-semibold text-brand-navy">{row.original.name}</span>
    ),
  },
  {
    id: "assignedTo",
    header: "Assigned to",
    cell: ({ row }) => <Assignment task={row.original} />,
  },
  {
    id: "requirement",
    header: "Requirement",
    cell: ({ row }) => (row.original.required ? "Mandatory" : "Optional"),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <div>
        <StatusBadge status={row.original.status} />
        {row.original.dueAt ? (
          <p className="mt-1 text-xs text-brand-navy/55">
            Due {formatLocalDateTime24(row.original.dueAt)}
          </p>
        ) : null}
      </div>
    ),
  },
  {
    id: "actionedAt",
    header: "Actioned at",
    cell: ({ row }) =>
      row.original.actionedAt
        ? formatLocalDateTime24(row.original.actionedAt)
        : "—",
  },
  {
    id: "actions",
    header: "Actions",
    enableSorting: false,
    cell: ({ row }) =>
      row.original.canOpen ? (
        <Link
          className="font-semibold text-brand-orange hover:underline"
          href={`/admin/tasks/${row.original.id}`}
        >
          View task
        </Link>
      ) : (
        <span className="text-brand-navy/40">—</span>
      ),
  },
];

export function WorkflowStageTaskAssignments({
  tasks,
}: {
  tasks: WorkflowProgressTask[];
}) {
  return (
    <div className="mt-6 border-t border-brand-navy/10 pt-4">
      <h4 className="mb-3 text-sm font-semibold text-brand-navy">
        Task assignments ({tasks.length})
      </h4>
      <DataTable
        columns={columns}
        data={tasks}
        density="compact"
        emptyMessage="No task instances are assigned to this stage yet."
        minWidth={820}
        rowKey={(task) => task.id}
      />
    </div>
  );
}
