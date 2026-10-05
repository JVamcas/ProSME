"use client";

import { DataTable, type DataTableColumn } from "@/shared/ui/DataTable";
import { ArrowLink } from "@/components/ui/links";
import { StatusBadge } from "@/components/ui/status-badge";
import { LockKeyhole } from "lucide-react";
import { formatLocalDateTime24 } from "@/lib/dateUtils";
import type { WorkflowProgressTask } from "../api/WorkflowProgressTypes";
import { workflowTaskTypeLabels } from "./WorkflowTaskTypeLabels";

function Assignment({ task }: { task: WorkflowProgressTask }) {
  const name = task.assignedUserName ?? task.assignedRoleName ?? "Unassigned";
  const reviewerCount = task.configuredReviewerCount ?? 1;

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

      {task.planned ? (
        <p className="mt-0.5 text-xs text-brand-navy/55">
          {reviewerCount} {reviewerCount === 1 ? "reviewer" : "reviewers"} ·
          Assigned on activation
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
    header: "Task",
    cell: ({ row }) => {
      const task = row.original;
      if (task.planned) return <span>{task.name}</span>;
      if (!task.canOpen && task.blockedReason) {
        return (
          <div>
            <span
              aria-disabled="true"
              className="inline-flex items-center gap-2 text-brand-navy/55"
            >
              <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5" />
              {task.name}
            </span>
            <p className="mt-1 text-xs text-brand-navy/55">
              {task.blockedReason}
            </p>
          </div>
        );
      }

      if (!task.canOpen) return <span>{task.name}</span>;

      return (
        <div>
          <ArrowLink href={`/admin/tasks/${task.id}`}>{task.name}</ArrowLink>
          {task.blockedReason ? (
            <p className="mt-1 text-xs text-brand-navy/55">
              {task.blockedReason}
            </p>
          ) : null}
        </div>
      );
    },
  },
  {
    accessorKey: "taskType",
    header: "Task type",
    cell: ({ row }) => workflowTaskTypeLabels[row.original.taskType],
  },
  {
    id: "assignedTo",
    header: "Assigned to",
    cell: ({ row }) => <Assignment task={row.original} />,
  },
  {
    id: "requirement",
    header: "Requirement",
    cell: ({ row }) => {
      const task = row.original;
      if (!task.required) return "Optional";
      if (
        task.taskType === "CONTRIBUTING" &&
        (task.configuredReviewerCount ?? 1) > 1 &&
        task.requiredReviewCount !== undefined
      ) {
        return `${task.requiredReviewCount} of ${task.configuredReviewerCount} reviews required`;
      }
      return "Mandatory";
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <StatusBadge
        status={row.original.processingStatus ?? row.original.status}
      />
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
      {tasks.some((task) => task.planned) ? (
        <p className="mb-3 text-sm text-brand-navy/65">
          Configured tasks are shown below. Assignments become active when this
          stage starts.
        </p>
      ) : null}
      <DataTable
        columns={columns}
        data={tasks}
        density="compact"
        emptyMessage="No task instances are assigned to this stage yet."
        minWidth={960}
        rowKey={(task) => task.id}
      />
    </div>
  );
}
