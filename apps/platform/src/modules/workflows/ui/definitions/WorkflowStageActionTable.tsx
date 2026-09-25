"use client";

import { Plus } from "lucide-react";

import { DeleteButton, EditButton } from "@/components/ui/action-buttons";
import { GeneralButton } from "@/components/ui/button";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/ui/data-table";
import type { WorkflowActionDefinition } from "@/modules/workflows/domain/actions/WorkflowActionDefinition";
import { WorkflowStageTabHeader } from "./WorkflowStageTabHeader";
import type { WorkflowStageInput } from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { workflowActionTypeItems } from "./WorkflowActionFormSchema";

type Props = {
  canEdit: boolean;
  onAdd: () => void;
  onDelete: (action: WorkflowActionDefinition) => void;
  onEdit: (action: WorkflowActionDefinition) => void;
  stage: WorkflowStageInput;
};

function actionTypeLabel(action: WorkflowActionDefinition) {
  return workflowActionTypeItems.find((item) => item.value === action.actionType)
    ?.label ?? action.actionType;
}

function actionColumns(
  canEdit: boolean,
  onDelete: (action: WorkflowActionDefinition) => void,
  onEdit: (action: WorkflowActionDefinition) => void,
  taskNamesByActionKey: ReadonlyMap<string, string[]>,
): DataTableColumn<WorkflowActionDefinition>[] {
  return [
    {
      accessorKey: "label",
      header: "Action",
      cell: ({ row }) => (
        <span className="font-semibold text-brand-navy">
          {row.original.label}
        </span>
      ),
    },
    {
      id: "task",
      header: "Task",
      cell: ({ row }) => (
        <span className="block max-w-56 whitespace-normal">
          {taskNamesByActionKey.get(row.original.stableKey)?.join(", ")
            ?? "Unassigned"}
        </span>
      ),
    },
    {
      accessorKey: "actionType",
      header: "Action type",
      cell: ({ row }) => actionTypeLabel(row.original),
    },
    {
      id: "reasonCode",
      header: "Reason code",
      cell: ({ row }) =>
        row.original.reasonCodeRequired ? "Required" : "Not required",
    },
    {
      accessorKey: "enabled",
      header: "Status",
      cell: ({ row }) => (row.original.enabled ? "Enabled" : "Disabled"),
    },
    {
      id: "controls",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-start gap-1">
          <EditButton
            disabled={!canEdit}
            onClick={() => onEdit(row.original)}
            title={`Edit ${row.original.label}`}
          />
          <DeleteButton
            disabled={!canEdit}
            onClick={() => onDelete(row.original)}
            title={`Delete ${row.original.label}`}
          />
        </div>
      ),
    },
  ];
}

export function WorkflowStageActionTable({
  canEdit,
  onAdd,
  onDelete,
  onEdit,
  stage,
}: Props) {
  const taskNamesByActionKey = new Map<string, string[]>();
  for (const task of stage.tasks) {
    for (const actionKey of task.actionKeys) {
      const taskNames = taskNamesByActionKey.get(actionKey) ?? [];
      taskNames.push(task.name);
      taskNamesByActionKey.set(actionKey, taskNames);
    }
  }

  return (
    <section className="mt-5">
      <WorkflowStageTabHeader
        action={
          <GeneralButton
            disabled={!canEdit}
            onClick={onAdd}
            size="compact"
            type="button"
            variant="primary"
          >
            <Plus className="size-4" /> Add action
          </GeneralButton>
        }
        count={stage.actions.length}
        description="Configure the decisions users can make during this stage."
        title="Actions"
      />
      <DataTable
        columns={actionColumns(
          canEdit,
          onDelete,
          onEdit,
          taskNamesByActionKey,
        )}
        data={stage.actions}
        emptyMessage="No actions have been added to this stage."
        minWidth={900}
      />
    </section>
  );
}
