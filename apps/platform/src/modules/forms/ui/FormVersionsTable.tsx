"use client";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatLocalDateTime24 } from "@/lib/dateUtils";
import { useFormEditor } from "@/modules/forms/FormHooks";
import type { FormVersionSummary } from "@/modules/forms/FormTypes";

function optionalDate(value: string | null) {
  return value ? formatLocalDateTime24(value) : "—";
}

const columns: DataTableColumn<FormVersionSummary>[] = [
  {
    accessorKey: "versionNumber",
    header: "Version",
    cell: ({ row }) => `Version ${row.original.versionNumber}`,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => formatLocalDateTime24(row.original.createdAt),
  },
  {
    accessorKey: "publishedAt",
    header: "Published",
    cell: ({ row }) => optionalDate(row.original.publishedAt),
  },
  {
    accessorKey: "retiredAt",
    header: "Retired",
    cell: ({ row }) => optionalDate(row.original.retiredAt),
  },
];

export function FormVersionsTable({ definitionId }: { definitionId: string }) {
  const query = useFormEditor(definitionId);

  if (query.isPending) {
    return <p className="py-3 text-sm text-slate-500">Loading versions…</p>;
  }

  if (query.error) {
    return (
      <p className="py-3 text-sm text-red-700" role="alert">
        {query.error.message}
      </p>
    );
  }

  return (
    <div aria-label={`${query.data.definition.name} versions`}>
      <DataTable
        columns={columns}
        data={query.data.versions}
        density="compact"
        emptyMessage="No versions have been created."
        rowKey={(version) => version.id}
      />
    </div>
  );
}
