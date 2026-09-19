"use client";

import Link from "next/link";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import type { WorkflowTemplateListItem } from "../../domain/definitions/WorkflowTemplate";
import { formatLocalDateTime24 } from "@/lib/dateUtils";

type Props = {
  emptyMessage: string;
  items: WorkflowTemplateListItem[];
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

const columns = [
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
    cell: ({ row }) => `Version ${row.original.currentVersion.number}`,
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
    id:"updatedAt",
    header:"Updated",
    cell:({row})=>{
      formatLocalDateTime24(row.original.updatedAt)
    }
  }
] satisfies DataTableColumn<WorkflowTemplateListItem>[];

export function WorkflowTemplateTable({ emptyMessage, items }: Props) {
  return (
    <section className="overflow-hidden bg-brand-white ">
      <DataTable
        columns={columns}
        data={items}
        emptyMessage={emptyMessage}
        minWidth={720}
      />
    </section>
  );
}
