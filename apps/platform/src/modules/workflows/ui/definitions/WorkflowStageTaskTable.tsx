"use client";

import { CheckCircle2, Plus } from "lucide-react";

import { DeleteButton, EditButton } from "@/components/ui/action-buttons";
import { GeneralButton } from "@/components/ui/button";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/ui/data-table";
import type {
  WorkflowAssignmentOptions,
  WorkflowStageInput,
  WorkflowTaskInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";

type Props = {
  assignmentOptions?: WorkflowAssignmentOptions;
  canEdit: boolean;
  onAdd: () => void;
  onDelete: (task: WorkflowTaskInput) => void;
  onEdit: (task: WorkflowTaskInput) => void;
  stage: WorkflowStageInput;
};

function assignmentLabel(
  task: WorkflowTaskInput,
  options?: WorkflowAssignmentOptions,
) {
  if (task.assignmentMode === "NAMED_USER" && task.namedUserOverrideId) {
    return (
      options?.users.find((item) => item.id === task.namedUserOverrideId)?.label ??
      "Specific user"
    );
  }
  const roleId = task.roleId;
  if (!roleId) return "Unassigned";
  const role = options?.roles.find((item) => item.id === roleId)?.label;
  return role ?? "Configured role";
}

function taskColumns(
  assignmentOptions: WorkflowAssignmentOptions | undefined,
  canEdit: boolean,
  onDelete: (task: WorkflowTaskInput) => void,
  onEdit: (task: WorkflowTaskInput) => void,
): DataTableColumn<WorkflowTaskInput>[] {
  return [
    {
      accessorKey: "name",
      header: "Task",
    },
    {
      accessorKey: "type",
      header: "Task type",
      cell: ({ row }) => row.original.type.replaceAll("_", " "),
    },
    {
      id: "assignee",
      header: "Assignee",
      cell: ({ row }) => (
        <span className="block max-w-56 truncate">
          {assignmentLabel(row.original, assignmentOptions)}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1.5 font-semibold text-brand-green">
          <CheckCircle2 className="size-3.5" />
          {row.original.quorum ? "Quorum" : "Configured"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-start gap-1">
          <EditButton
            disabled={!canEdit}
            onClick={() => onEdit(row.original)}
            title={`Edit ${row.original.name}`}
          />
          <DeleteButton
            disabled={!canEdit}
            onClick={() => onDelete(row.original)}
            title={`Delete ${row.original.name}`}
          />
        </div>
      ),
    },
  ];
}

export function WorkflowStageTaskTable({
  assignmentOptions,
  canEdit,
  onAdd,
  onDelete,
  onEdit,
  stage,
}: Props) {
  return (
    <section className="mt-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="text-sm font-bold text-brand-navy">
          Tasks ({stage.tasks.length})
        </h4>
        <GeneralButton
          disabled={!canEdit}
          onClick={onAdd}
          size="compact"
          type="button"
          variant="primary"
        >
          <Plus className="size-4" /> Add task
        </GeneralButton>
      </div>
      <DataTable
        columns={taskColumns(
          assignmentOptions,
          canEdit,
          onDelete,
          onEdit,
        )}
        data={stage.tasks}
        density="compact"
        emptyMessage="No tasks have been added to this stage."
        minWidth={820}
      />
    </section>
  );
}
