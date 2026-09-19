"use client";

import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { GeneralButton } from "@/components/ui/button";
import type { FormDefinitionSummary } from "@/modules/forms/FormTypes";
import { EditButton } from "@/components/ui/action-buttons";
import { formatLocalDateTime24 } from "@/lib/dateUtils";
import { StatusBadge } from "@/components/ui/status-badge";

function formColumns(
  canUpdate: boolean,
  onEdit: (form: FormDefinitionSummary) => void,
): DataTableColumn<FormDefinitionSummary>[] {
  return [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <Link
            className="font-semibold text-brand-orange underline"
            href={`/admin/settings/forms/${row.original.id}`}
          >
            {row.original.name}
          </Link>
          <span>{row.original.code}</span>
        </div>
      ),
    },
    { accessorKey: "latestVersion", header: "Latest version" },
    {
      accessorKey: "latestStatus",
      header: "Status",

      cell: ({ row }) => row.original.latestStatus ? (
        <StatusBadge status={row.original.latestStatus} />
      ) : null,
    },
    {
      accessorKey: "updatedAt",
      header: "Updated",
      cell: ({ row }) => formatLocalDateTime24(row.original.updatedAt),
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
