"use client";

import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/shared/ui/DataTable";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatLocalDateTime24 } from "@/lib/dateUtils";
import { useFormEditor } from "@/modules/forms/FormHooks";
import type { FormVersionSummary } from "@/modules/forms/FormTypes";
import {
  FormVersionActions,
  type FormVersionActionOptions,
} from "./staff/FormVersionActions";

function optionalDate(value: string | null) {
  return value ? formatLocalDateTime24(value) : "—";
}

function versionColumns(
  actions: FormVersionActionOptions,
): DataTableColumn<FormVersionSummary>[] {
  return [
    {
      accessorKey: "versionNumber",
      header: "Version",
      cell: ({ row }) => (
        <Link
          className="text-brand-orange underline"
          href={`/admin/settings/forms/${row.original.formDefinitionId}?versionId=${row.original.id}`}
        >
          v{row.original.versionNumber}
        </Link>
      ),
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
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <FormVersionActions version={row.original} options={actions} />
      ),
    },
  ];
}

export function FormVersionsTable({
  definitionId,
  actions,
}: {
  definitionId: string;
  actions: FormVersionActionOptions;
}) {
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
        columns={versionColumns(actions)}
        data={query.data.versions}
        density="compact"
        emptyMessage="No versions have been created."
        rowKey={(version) => version.id}
      />
    </div>
  );
}
