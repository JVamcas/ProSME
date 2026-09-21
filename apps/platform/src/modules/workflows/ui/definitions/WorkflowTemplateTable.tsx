"use client";

import Link from "next/link";

import {
  CloneButton,
  DeleteButton,
  EditButton,
} from "@/components/ui/action-buttons";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatLocalDateTime24 } from "@/lib/dateUtils";
import type { WorkflowTemplateListItem } from "../../domain/definitions/WorkflowTemplate";

type Props = {
  canUpdate: boolean;
  cloningId?: string;
  deletingId?: string;
  emptyMessage: string;
  items: WorkflowTemplateListItem[];
  onClone: (template: WorkflowTemplateListItem) => void;
  onDelete: (template: WorkflowTemplateListItem) => void;
  onEdit: (template: WorkflowTemplateListItem) => void;
};

function statusLabel(
  status: WorkflowTemplateListItem["currentVersion"]["status"],
) {
  return status
    .toLocaleLowerCase()
    .split("_")
    .map((word) => `${word.charAt(0).toLocaleUpperCase()}${word.slice(1)}`)
    .join(" ");
}

function actionCell(template: WorkflowTemplateListItem, options: Props) {
  const isDraft = template.currentVersion.status === "DRAFT";
  const canDelete = isDraft && template.currentVersion.number === 1;
  return (
    <div className="flex items-center gap-1">
      <EditButton
        disabled={!options.canUpdate}
        onClick={() => options.onEdit(template)}
        title={`Edit ${template.name}`}
      />
      <CloneButton
        disabled={!options.canUpdate || Boolean(options.cloningId)}
        isLoading={options.cloningId === template.id}
        onClick={() => options.onClone(template)}
        title={`Clone ${template.name}`}
      />
      <DeleteButton
        disabled={
          !options.canUpdate || !canDelete || Boolean(options.deletingId)
        }
        isLoading={options.deletingId === template.id}
        onClick={() => options.onDelete(template)}
        title={`Delete ${template.name}`}
      />
    </div>
  );
}

function columns(options: Props): DataTableColumn<WorkflowTemplateListItem>[] {
  return [
    {
      accessorKey: "name",
      header: "Template",
      cell: ({ row }) => (
        <div>
          <Link
            className="font-semibold text-brand-orange"
            href={`/admin/workflows/${row.original.id}`}
          >
            {row.original.name}
          </Link>
          <span className="mt-1 block text-xs text-brand-navy/55">
            {row.original.code}
          </span>
        </div>
      ),
    },
    {
      id: "currentVersion",
      header: "Current version",
      cell: ({ row }) => `v${row.original.currentVersion.number}`,
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge
          label={statusLabel(row.original.currentVersion.status)}
          status={row.original.currentVersion.status}
        />
      ),
    },
    {
      id: "updatedAt",
      header: "Updated",
      cell: ({ row }) => formatLocalDateTime24(row.original.updatedAt),
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => actionCell(row.original, options),
    },
  ];
}

export function WorkflowTemplateTable(props: Props) {
  return (
    <section className="overflow-hidden bg-brand-white">
      <DataTable
        columns={columns(props)}
        data={props.items}
        emptyMessage={props.emptyMessage}
        minWidth={860}
      />
    </section>
  );
}
