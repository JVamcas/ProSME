"use client";

import { Plus } from "lucide-react";

import { DeleteButton, EditButton } from "@/components/ui/action-buttons";
import { GeneralButton } from "@/components/ui/button";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/ui/data-table";
import type { WorkflowActionDefinition } from "@/modules/workflows/domain/actions/WorkflowActionDefinition";
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
  return (
    <section className="mt-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="text-sm font-bold text-brand-navy">
          Actions ({stage.actions.length})
        </h4>
        <GeneralButton
          disabled={!canEdit}
          onClick={onAdd}
          size="compact"
          type="button"
          variant="primary"
        >
          <Plus className="size-4" /> Add action
        </GeneralButton>
      </div>
      <DataTable
        columns={actionColumns(canEdit, onDelete, onEdit)}
        data={stage.actions}
        emptyMessage="No actions have been added to this stage."
        minWidth={760}
      />
    </section>
  );
}
