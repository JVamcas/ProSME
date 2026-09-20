"use client";

import { Plus } from "lucide-react";

import { DeleteButton, EditButton } from "@/components/ui/action-buttons";
import { GeneralButton } from "@/components/ui/button";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/ui/data-table";
import type { WorkflowStageChecklistDefinition } from "@/modules/workflows/domain/definitions/WorkflowStageChecklistDefinition";
import { WorkflowStageTabHeader } from "./WorkflowStageTabHeader";
import type { WorkflowStageInput } from "@/modules/workflows/domain/definitions/WorkflowTypes";
import {
  checklistEvidenceRequirementItems,
  checklistResponseTypeItems,
} from "./WorkflowStageChecklistFormSchema";

type Props = {
  canEdit: boolean;
  onAdd: () => void;
  onDelete: (item: WorkflowStageChecklistDefinition) => void;
  onEdit: (item: WorkflowStageChecklistDefinition) => void;
  stage: WorkflowStageInput;
};

function optionLabel(
  items: readonly { label: string; value: string }[],
  value: string,
) {
  return items.find((item) => item.value === value)?.label ?? value;
}

function checklistColumns(
  canEdit: boolean,
  onDelete: (item: WorkflowStageChecklistDefinition) => void,
  onEdit: (item: WorkflowStageChecklistDefinition) => void,
): DataTableColumn<WorkflowStageChecklistDefinition>[] {
  return [
    {
      accessorKey: "displayOrder",
      header: "Order",
    },
    {
      accessorKey: "key",
      header: "Key",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.key}</span>
      ),
    },
    {
      accessorKey: "text",
      header: "Text",
      cell: ({ row }) => (
        <span className="block max-w-80 whitespace-normal">
          {row.original.text}
        </span>
      ),
    },
    {
      accessorKey: "responseType",
      header: "Response",
      cell: ({ row }) => optionLabel(
        checklistResponseTypeItems,
        row.original.responseType,
      ),
    },
    {
      accessorKey: "evidenceRequirement",
      header: "Evidence",
      cell: ({ row }) => optionLabel(
        checklistEvidenceRequirementItems,
        row.original.evidenceRequirement,
      ),
    },
    {
      accessorKey: "mandatory",
      header: "Mandatory",
      cell: ({ row }) => (row.original.mandatory ? "Yes" : "No"),
    },
    {
      accessorKey: "notes",
      header: "Notes",
      cell: ({ row }) => row.original.notes || "—",
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
            title={`Edit ${row.original.key}`}
          />
          <DeleteButton
            disabled={!canEdit}
            onClick={() => onDelete(row.original)}
            title={`Delete ${row.original.key}`}
          />
        </div>
      ),
    },
  ];
}

export function WorkflowStageChecklistTable({
  canEdit,
  onAdd,
  onDelete,
  onEdit,
  stage,
}: Props) {
  const checklistItems = [...stage.checklistItems].sort(
    (left, right) => left.displayOrder - right.displayOrder,
  );
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
            <Plus className="size-4" /> Add checklist item
          </GeneralButton>
        }
        count={checklistItems.length}
        description="Define the checks reviewers must complete during this stage."
        title="Checklist items"
      />
      <DataTable
        columns={checklistColumns(canEdit, onDelete, onEdit)}
        data={checklistItems}
        emptyMessage="No checklist items have been added to this stage."
        minWidth={1120}
      />
    </section>
  );
}
