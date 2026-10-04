"use client";

import { Plus } from "lucide-react";

import { GeneralButton } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/shared/ui/DataTable";
import type { WorkflowActionDefinition } from "@/modules/workflows/domain/actions/WorkflowActionDefinition";
import { ActionMenu } from "@/shared/ui/ActionMenu";
import { WorkflowStageTabHeader } from "./WorkflowStageTabHeader";
import type {
  WorkflowGraphInput,
  WorkflowStageInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import {
  workflowActionRoutes,
  workflowRouteDestination,
} from "./WorkflowActionEditorRoutes";
import { workflowActionTypeItems } from "./WorkflowActionFormSchema";
import { StatusBadge } from "@/components/ui/status-badge";

type Props = {
  canEdit: boolean;
  graph: WorkflowGraphInput;
  onAdd: () => void;
  onDelete: (action: WorkflowActionDefinition) => void;
  onEdit: (action: WorkflowActionDefinition) => void;
  stage: WorkflowStageInput;
};

function actionTypeLabel(action: WorkflowActionDefinition) {
  return (
    workflowActionTypeItems.find((item) => item.value === action.actionType)
      ?.label ?? action.actionType
  );
}

function actionColumns(
  canEdit: boolean,
  graph: WorkflowGraphInput,
  stage: WorkflowStageInput,
  onDelete: (action: WorkflowActionDefinition) => void,
  onEdit: (action: WorkflowActionDefinition) => void,
  taskNamesByActionKey: ReadonlyMap<string, string[]>,
): DataTableColumn<WorkflowActionDefinition>[] {
  return [
    {
      accessorKey: "label",
      header: "Action Button Label",
      cell: ({ row }) => (
        <span className="font-semibold text-brand-navy">
          {row.original.label}
        </span>
      ),
    },
    {
      id: "task",
      header: "Visible in Tasks",
      cell: ({ row }) => (
        <span className="block max-w-56 whitespace-normal">
          {taskNamesByActionKey.get(row.original.stableKey)?.join(", ") ??
            "Unassigned"}
        </span>
      ),
    },
    {
      accessorKey: "actionType",
      header: "Action type",
      cell: ({ row }) => actionTypeLabel(row.original),
    },
    {
      accessorKey: "enabled",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.enabled ? "Active" : "Disabled"
        return (
          <StatusBadge status={status} label={status} />
        )
      },
    },
    {
      id: "routing",
      header: "Destination",
      cell: ({ row }) => {
        const routes = workflowActionRoutes(
          graph.transitions,
          stage.stableKey,
          row.original.stableKey,
        );
        if (routes.length === 0) return "--";
        if (routes.length > 1) return `${routes.length} routes`;
        return workflowRouteDestination(routes[0], graph);
      },
    },
    {
      id: "controls",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-start">
          <ActionMenu
            items={[
              {
                id: "edit",
                label: "Edit",
                disabled: !canEdit,
                onAction: () => onEdit(row.original),
              },
              {
                id: "delete",
                label: "Delete",
                disabled: !canEdit,
                destructive: true,
                onAction: () => onDelete(row.original),
              },
            ]}
            label={`Actions for ${row.original.label}`}
          />
        </div>
      ),
    },
  ];
}

export function WorkflowStageActionTable({
  canEdit,
  graph,
  onAdd,
  onDelete,
  onEdit,
  stage,
}: Props) {
  const visibleActions = stage.actions.filter(
    (action) => action.actionType !== "WITHDRAW",
  );
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
        count={visibleActions.length}
        description="Configure the decisions users can make during this stage."
        title="Actions"
      />
      <DataTable
        columns={actionColumns(
          canEdit,
          graph,
          stage,
          onDelete,
          onEdit,
          taskNamesByActionKey,
        )}
        data={visibleActions}
        emptyMessage="No actions have been added to this stage."
        minWidth={1080}
      />
    </section>
  );
}
