"use client";

import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { GeneralButton } from "@/components/ui/button";
import type { FormDefinitionSummary } from "@/modules/forms/FormTypes";
import { EditButton } from "@/components/ui/action-buttons";

function formColumns(
  canUpdate: boolean,
  onEdit: (form: FormDefinitionSummary) => void,
): DataTableColumn<FormDefinitionSummary>[] {
  return [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <Link
          className="font-semibold text-brand-orange underline"
          href={`/admin/settings/forms/${row.original.id}`}
        >
          {row.original.name}
        </Link>
      ),
    },
    { accessorKey: "code", header: "Code" },
    { accessorKey: "latestVersion", header: "Latest version" },
    { accessorKey: "latestStatus", header: "Status" },
    { accessorKey: "fieldCount", header: "Fields" },
    { accessorKey: "usedByCount", header: "Used by" },
    {
      accessorKey: "updatedAt",
      cell: ({ row }) =>
        new Date(row.original.updatedAt).toLocaleDateString("en-NA"),
      header: "Updated",
    },
    {
      cell: ({ row }) => (
        <div className="flex items-center justify-start gap-2">
          <EditButton
            disabled={!canUpdate || row.original.latestStatus !== "DRAFT"}
            onClick={() => onEdit(row.original)}
            title="Edit form"
          />
        </div>
      ),
      header: "Actions",
      id: "actions",
    },
  ];
}

export function FormsTable({
  canCreate,
  canUpdate,
  emptyMessage,
  items,
  onCreate,
  onEdit,
}: {
  canCreate: boolean;
  canUpdate: boolean;
  emptyMessage: string;
  items: FormDefinitionSummary[];
  onCreate: () => void;
  onEdit: (form: FormDefinitionSummary) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <GeneralButton disabled={!canCreate} onClick={onCreate} type="button">
          Create form
        </GeneralButton>
      </div>
      <DataTable
        columns={formColumns(canUpdate, onEdit)}
        data={items}
        emptyMessage={emptyMessage}
      />
    </div>
  );
}
