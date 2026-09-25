"use client";

import { Plus } from "lucide-react";

import { DeleteButton, EditButton } from "@/components/ui/action-buttons";
import { GeneralButton } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import type { WorkflowStageCommentField } from "@/modules/workflows/domain/definitions/WorkflowStageCommentField";
import type { WorkflowStageInput } from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { WorkflowStageTabHeader } from "./WorkflowStageTabHeader";

type Props = {
  canEdit: boolean;
  onAdd: () => void;
  onDelete: (field: WorkflowStageCommentField) => void;
  onEdit: (field: WorkflowStageCommentField) => void;
  stage: WorkflowStageInput;
};

function columns(
  canEdit: boolean,
  onDelete: Props["onDelete"],
  onEdit: Props["onEdit"],
): DataTableColumn<WorkflowStageCommentField>[] {
  return [
    {
      id: "task",
      header: "Workflow task",
      cell: ({ row }) => row.original.taskStableKey,
    },
    { accessorKey: "displayOrder", header: "Order" },
    {
      accessorKey: "key",
      header: "Key",
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.key}</span>,
    },
    { accessorKey: "label", header: "Label" },
    {
      accessorKey: "helpText",
      header: "Help",
      cell: ({ row }) => row.original.helpText || "—",
    },
    {
      accessorKey: "mandatory",
      header: "Mandatory",
      cell: ({ row }) => (row.original.mandatory ? "Yes" : "No"),
    },
    {
      accessorKey: "visibility",
      header: "Visibility",
      cell: ({ row }) => row.original.visibility === "APPLICANT_VISIBLE"
        ? "Applicant visible"
        : "Internal only",
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

export function WorkflowStageCommentFieldTable({
  canEdit,
  onAdd,
  onDelete,
  onEdit,
  stage,
}: Props) {
  const fields = [...(stage.commentFields ?? [])].sort(
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
            <Plus className="size-4" /> Add field
          </GeneralButton>
        }
        count={fields.length}
        description="Define comments and recommendations requested from assigned task reviewers."
        title="Comments and recommendations"
      />
      <DataTable
        columns={columns(canEdit, onDelete, onEdit)}
        data={fields}
        emptyMessage="No comment or recommendation fields have been added."
        minWidth={980}
      />
    </section>
  );
}
