"use client";

import Link from "next/link";

import { ActionMenu, type ActionMenuItem } from "@/shared/ui/ActionMenu";
import { DataTable, type DataTableColumn } from "@/shared/ui/DataTable";
import { Pagination } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatLocalDateTime24 } from "@/lib/dateUtils";
import {
  workflowTemplatePublishableStatuses,
  type WorkflowTemplateListItem,
} from "../../domain/definitions/WorkflowTemplate";

type Props = {
  canPublish: boolean;
  canUpdate: boolean;
  cloningVersionId?: string;
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
  const items: ActionMenuItem[] = [
    {
      id: "edit",
      label: "Edit",
      disabled: !options.canUpdate || !isDraft,
      onAction: () => options.onEdit(template),
    },
    {
      id: "clone",
      label: options.cloningVersionId === template.currentVersion.id
        ? "Cloning…"
        : "Clone",
      disabled: !options.canUpdate || Boolean(options.cloningVersionId),
      onAction: () => options.onClone(template),
    },
  ];

  if (
    workflowTemplatePublishableStatuses.includes(template.currentVersion.status)
  ) {
    items.push({
      id: "publish",
      label: options.publishingId === template.id ? "Publishing…" : "Publish",
      disabled: !options.canPublish || Boolean(options.publishingId),
      onAction: () => options.onPublish(template),
    });
  }

  items.push({
    id: "delete",
    label: options.deletingId === template.id ? "Deleting…" : "Delete",
    disabled: !options.canUpdate || !canDelete || Boolean(options.deletingId),
    destructive: true,
    onAction: () => options.onDelete(template),
  });

  return (
    <ActionMenu
      items={items}
      label={`Actions for ${template.name} v${template.currentVersion.number}`}
    />
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
            href={`/admin/workflows/${row.original.id}?versionId=${row.original.currentVersion.id}`}
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
          <Pagination
            disabled={props.isFetching}
            hasNextPage={props.page < props.totalPages}
            onNext={() => props.onPageChange(props.page + 1)}
            onPageSizeChange={props.onPageSizeChange}
            onPrevious={() => props.onPageChange(props.page - 1)}
            page={props.page}
            pageSize={props.pageSize}
            total={props.total}
          />
        }
        minWidth={860}
        rowKey={(item) => item.currentVersion.id}
      />
    </section>
  );
}
