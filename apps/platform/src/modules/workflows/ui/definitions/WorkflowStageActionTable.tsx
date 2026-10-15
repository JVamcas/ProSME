"use client";
import { WorkflowSearchTarget } from "./search/WorkflowSearchTarget";

import { Plus } from "lucide-react";
import { useState } from "react";

import { GeneralButton } from "@/shared/ui/Button";
import { DataTable, type DataTableColumn } from "@/shared/ui/DataTable";
import type { WorkflowActionDefinition } from "@/modules/workflows/domain/actions/WorkflowActionDefinition";
import { ActionMenu } from "@/shared/ui/ActionMenu";
import { WorkflowStageTabHeader } from "./WorkflowStageTabHeader";
import type {
  WorkflowGraphInput,
  WorkflowEditorView,
  WorkflowStageInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import {
  workflowActionRoutes,
  workflowRouteDestination,
} from "./WorkflowActionEditorRoutes";
import { workflowActionTypeItems } from "./WorkflowActionFormSchema";
import { StatusBadge } from "@/components/ui/status-badge";
import { WorkflowActionNotificationsDrawer } from "./WorkflowActionNotificationsDrawer";

type Props = {
  canEdit: boolean;
  editor: WorkflowEditorView;
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
  onNotifications: (action: WorkflowActionDefinition) => void,
): DataTableColumn<WorkflowActionDefinition>[] {
  return [
    {
      accessorKey: "label",
      header: "Action Button Label",
      cell: ({ row }) => (
        <WorkflowSearchTarget tab="actions" itemKey={row.original.stableKey}>
          {row.original.label}
        </WorkflowSearchTarget>
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
        const status = row.original.enabled ? "Active" : "Disabled";
        return <StatusBadge status={status} label={status} />;
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
      id: "notifications",
      header: "Notifications",
      accessorFn: (action) => action.notifications?.length ?? 0,
      cell: ({ row }) => {
        const count = row.original.notifications?.length ?? 0;
        return count > 0 ? (
          <GeneralButton
            aria-label={`View notifications for ${row.original.label}`}
            className="rounded-md p-0 text-sm text-brand-navy underline underline-offset-4"
            onClick={() => onNotifications(row.original)}
            size={null}
            variant={null}
          >
            View ({count})
          </GeneralButton>
        ) : (
          <span className="text-brand-navy/50">None</span>
        );
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
                id: "notifications",
                label: "Notifications",
                onAction: () => onNotifications(row.original),
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
  editor,
  onAdd,
  onDelete,
  onEdit,
  stage,
}: Props) {
  const [notificationActionKey, setNotificationActionKey] = useState<
    string | null
  >(null);
  const notificationAction = stage.actions.find(
    (action) => action.stableKey === notificationActionKey,
  );
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
          editor.graph,
          stage,
          onDelete,
          onEdit,
          taskNamesByActionKey,
          (action) => setNotificationActionKey(action.stableKey),
        )}
        data={visibleActions}
        emptyMessage="No actions have been added to this stage."
        minWidth={1080}
      />
      {notificationAction ? (
        <WorkflowActionNotificationsDrawer
          key={`${editor.version.id}:${notificationAction.stableKey}`}
          action={notificationAction}
          editor={editor}
          stage={stage}
          canEdit={canEdit}
          onClose={() => setNotificationActionKey(null)}
        />
      ) : null}
    </section>
  );
}
