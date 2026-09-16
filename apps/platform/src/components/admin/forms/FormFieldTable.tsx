"use client";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { DeleteButton, EditButton } from "@/components/ui/action-buttons";
import type { FormField } from "@/modules/forms/FormTypes";

type FieldRow = { original: FormField };

function positionCell({ row }: { row: FieldRow }) {
  return `${row.original.rowIndex}:${row.original.columnIndex}`;
}

function requiredCell({ row }: { row: FieldRow }) {
  return row.original.required ? "Yes" : "No";
}

function actionsCell(
  canUpdate: boolean,
  onEdit: (field: FormField) => void,
  onDelete: (field: FormField) => void,
  { row }: { row: FieldRow },
) {
  return (
    <div className="flex gap-1">
      <EditButton
        disabled={!canUpdate}
        onClick={() => onEdit(row.original)}
        title={`Edit ${row.original.label}`}
      />
      <DeleteButton
        disabled={!canUpdate}
        onClick={() => onDelete(row.original)}
        title={`Delete ${row.original.label}`}
      />
    </div>
  );
}

function columns(
  canUpdate: boolean,
  onEdit: (field: FormField) => void,
  onDelete: (field: FormField) => void,
): DataTableColumn<FormField>[] {
  return [
    { accessorKey: "label", header: "Label" },
    { accessorKey: "code", header: "Code" },
    { accessorKey: "inputType", header: "Input type" },
    { accessorKey: "dataType", header: "Data type" },
    { accessorKey: "rowIndex", cell: positionCell, header: "Position" },
    { accessorKey: "columnSpan", header: "Span" },
    { accessorKey: "required", cell: requiredCell, header: "Required" },
    {
      cell: (context) => actionsCell(canUpdate, onEdit, onDelete, context),
      header: "Actions",
      id: "actions",
    },
  ];
}

export function FormFieldTable({
  canUpdate,
  fields,
  onDelete,
  onEdit,
}: {
  canUpdate: boolean;
  fields: FormField[];
  onDelete: (field: FormField) => void;
  onEdit: (field: FormField) => void;
}) {
  return (
    <DataTable
      columns={columns(canUpdate, onEdit, onDelete)}
      data={fields}
      emptyMessage="No fields configured."
    />
  );
}
