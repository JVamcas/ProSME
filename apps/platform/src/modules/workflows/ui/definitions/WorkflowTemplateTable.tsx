"use client";

import Link from "next/link";

import {
  CloneButton,
  DeleteButton,
  EditButton,
  PublishButton,
} from "@/components/ui/action-buttons";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { DataTablePagination } from "@/shared/ui/DataTablePagination";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatLocalDateTime24 } from "@/lib/dateUtils";
import {
  workflowTemplatePublishableStatuses,
  type WorkflowTemplateListItem,
} from "../../domain/definitions/WorkflowTemplate";

type Props = {
  canPublish: boolean;
  canUpdate: boolean;
  cloningId?: string;
  deletingId?: string;
  emptyMessage: string;
  items: WorkflowTemplateListItem[];
  isFetching: boolean;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onClone: (template: WorkflowTemplateListItem) => void;
  onDelete: (template: WorkflowTemplateListItem) => void;
  onEdit: (template: WorkflowTemplateListItem) => void;
  onPublish: (template: WorkflowTemplateListItem) => void;
  publishingId?: string;
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
  const canDelete =
    template.isLatest && isDraft && template.currentVersion.number === 1;
  return (
    <div className="flex items-center gap-1">
      <EditButton
        disabled={!options.canUpdate || !template.isLatest || !isDraft}
        onClick={() => options.onEdit(template)}
        title={`Edit ${template.name}`}
      />
      <CloneButton
        disabled={!options.canUpdate || Boolean(options.cloningId)}
        isLoading={options.cloningId === template.id}
        onClick={() => options.onClone(template)}
        title={`Clone ${template.name}`}
      />
      {template.isLatest &&
      workflowTemplatePublishableStatuses.includes(
        template.currentVersion.status,
      ) ? (
        <PublishButton
          disabled={!options.canPublish || Boolean(options.publishingId)}
          isLoading={options.publishingId === template.id}
          onClick={() => options.onPublish(template)}
          title={`Publish ${template.name}`}
        />
      ) : null}
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
      enableSorting: false,
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
      header: "Version",
      enableSorting: false,
      cell: ({ row }) => `v${row.original.currentVersion.number}`,
    },
    {
      id: "status",
      header: "Status",
      enableSorting: false,
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
      enableSorting: false,
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
        footer={
          <DataTablePagination
            disabled={props.isFetching}
            onPageChange={props.onPageChange}
            onPageSizeChange={props.onPageSizeChange}
            page={props.page}
            pageSize={props.pageSize}
            total={props.total}
            totalPages={props.totalPages}
          />
        }
        minWidth={860}
        rowKey={(item) => item.currentVersion.id}
      />
    </section>
  );
}
