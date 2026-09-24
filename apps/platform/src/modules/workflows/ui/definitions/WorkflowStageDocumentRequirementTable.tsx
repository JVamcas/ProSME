"use client";

import { Plus } from "lucide-react";

import { DeleteButton, EditButton } from "@/components/ui/action-buttons";
import { GeneralButton } from "@/components/ui/button";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/ui/data-table";
import type { WorkflowStageDocumentRequirement } from "@/modules/workflows/domain/definitions/WorkflowStageDocumentRequirement";
import { WorkflowStageTabHeader } from "./WorkflowStageTabHeader";
import type { WorkflowStageInput } from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { documentActorItems } from "./WorkflowStageDocumentRequirementFormSchema";

type Props = {
  canEdit: boolean;
  onAdd: () => void;
  onDelete: (requirement: WorkflowStageDocumentRequirement) => void;
  onEdit: (requirement: WorkflowStageDocumentRequirement) => void;
  stage: WorkflowStageInput;
};

function actorLabel(value: string) {
  return documentActorItems.find((item) => item.value === value)?.label ?? value;
}

function documentRequirementColumns(
  canEdit: boolean,
  onDelete: (requirement: WorkflowStageDocumentRequirement) => void,
  onEdit: (requirement: WorkflowStageDocumentRequirement) => void,
): DataTableColumn<WorkflowStageDocumentRequirement>[] {
  return [
    {
      accessorKey: "name",
      header: "Document",
      cell: ({ row }) => (
        <span className="font-semibold text-brand-navy">
          {row.original.name}
        </span>
      ),
    },
    {
      accessorKey: "mandatory",
      header: "Mandatory",
      cell: ({ row }) => (row.original.mandatory ? "Yes" : "No"),
    },
    {
      accessorKey: "acceptedFileTypes",
      header: "Accepted types",
      cell: ({ row }) => row.original.acceptedFileTypes.join(", "),
    },
    {
      accessorKey: "maximumSizeMb",
      header: "Max size",
      cell: ({ row }) => `${row.original.maximumSizeMb} MB`,
    },
    {
      accessorKey: "expiryDays",
      header: "Expiry",
      cell: ({ row }) => row.original.expiryDays
        ? `${row.original.expiryDays} days`
        : "No expiry",
    },
    {
      id: "actors",
      header: "Uploader / verifier",
      cell: ({ row }) => (
        <span className="whitespace-normal">
          {actorLabel(row.original.uploader)} / {actorLabel(row.original.verifier)}
        </span>
      ),
    },
    {
      accessorKey: "templateReference",
      header: "Template",
      cell: ({ row }) => row.original.templateReference || "—",
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

export function WorkflowStageDocumentRequirementTable({
  canEdit,
  onAdd,
  onDelete,
  onEdit,
  stage,
}: Props) {
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
            <Plus className="size-4" /> Add document requirement
          </GeneralButton>
        }
        count={stage.documentRequirements.length}
        description="Specify the documents required to complete this stage."
        title="Document requirements"
      />
      <DataTable
        columns={documentRequirementColumns(canEdit, onDelete, onEdit)}
        data={stage.documentRequirements}
        emptyMessage="No document requirements have been added to this stage."
        minWidth={1160}
      />
    </section>
  );
}
