"use client";

import Link from "next/link";
import { useState } from "react";
import { useWorkflowTemplateVersions } from "../../WorkflowHooks";

import { ActionMenu, type ActionMenuItem } from "@/shared/ui/ActionMenu";
import { DataTable, type DataTableColumn } from "@/shared/ui/DataTable";
import { Pagination } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatLocalDateTime24 } from "@/lib/dateUtils";
import {
  workflowTemplatePublishableStatuses,
  type WorkflowTemplateListItem,
} from "../../domain/definitions/WorkflowTemplate";
import { ArrowLink } from "@/components/ui/links";

export type WorkflowTemplateVersionActions = {
  canCreate: boolean;
  canPublish: boolean;
  canUpdate: boolean;
  cloningVersionId?: string;
  deletingId?: string;
  onCreateDraft: (template: WorkflowTemplateListItem) => void;
  onCreateTemplate: (template: WorkflowTemplateListItem) => void;
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

function actionCell(
  template: WorkflowTemplateListItem,
  options: WorkflowTemplateVersionActions,
) {
  const isDraft = template.currentVersion.status === "DRAFT";
  const canDelete =
    template.isLatest && isDraft && template.currentVersion.number === 1;
  const items: ActionMenuItem[] = [
    {
      id: "create-draft",
      label:
        options.cloningVersionId === template.currentVersion.id
          ? "Creating draft…"
          : "Create draft version",
      disabled:
        !options.canUpdate || isDraft || Boolean(options.cloningVersionId),
      onAction: () => options.onCreateDraft(template),
    },
    {
      id: "create-template",
      label: "Create new template (v1)",
      disabled: !options.canCreate,
      onAction: () => options.onCreateTemplate(template),
    },
  ];

  if (
    workflowTemplatePublishableStatuses.includes(template.currentVersion.status)
  ) {
    items.push({
      id: "publish",
      label:
        options.publishingId === template.currentVersion.id
          ? "Publishing…"
          : "Publish",
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

function columns(
  options: WorkflowTemplateVersionActions,
): DataTableColumn<WorkflowTemplateListItem>[] {
  return [
    {
      id: "currentVersion",
      header: "Version",
      enableSorting: false,
      cell: ({ row }) => (
        <ArrowLink href={`/admin/workflows/${row.original.id}?versionId=${row.original.currentVersion.id}`}>
          v${row.original.currentVersion.number}
        </ArrowLink>
      ),
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

export function WorkflowTemplateVersionTable({
  templateId,
  ...actions
}: WorkflowTemplateVersionActions & { templateId: string }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const versions = useWorkflowTemplateVersions(templateId, page, pageSize);
  const totalPages = versions.data?.totalPages ?? 0;
  return (
    <section
      className="overflow-hidden bg-brand-white"
      aria-label="Template versions"
    >
      <DataTable
        columns={columns(actions)}
        data={versions.data?.items ?? []}
        emptyMessage={
          versions.isLoading
            ? "Loading workflow versions…"
            : "No workflow versions found."
        }
        footer={
          <Pagination
            disabled={versions.isFetching}
            hasNextPage={page < totalPages}
            onNext={() => setPage(page + 1)}
            onPageSizeChange={(value) => {
              setPageSize(value);
              setPage(1);
            }}
            onPrevious={() => setPage(page - 1)}
            page={page}
            pageSize={pageSize}
            total={versions.data?.total ?? 0}
          />
        }
        minWidth={860}
        rowKey={(item) => item.currentVersion.id}
      />
    </section>
  );
}
