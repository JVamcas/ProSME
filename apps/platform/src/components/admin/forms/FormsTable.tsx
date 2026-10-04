"use client";

import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/shared/ui/DataTable";
import { GeneralButton } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { formPurposeOptions } from "@/modules/forms/FormTypes";
import type { FormDefinitionSummary } from "@/modules/forms/FormTypes";
import { formatLocalDateTime24 } from "@/lib/dateUtils";
import { StatusBadge } from "@/components/ui/status-badge";
import { FormVersionsTable } from "@/modules/forms/ui/FormVersionsTable";
import { ActionMenu, type ActionMenuItem } from "@/shared/ui/ActionMenu";

export type FormTablePendingAction = {
  action: "clone" | "preview" | "publish" | "retire";
  definitionId: string;
};

type FormTableOptions = {
  canPublish: boolean;
  canRetire: boolean;
  canUpdate: boolean;
  onClone: (form: FormDefinitionSummary) => void;
  onEdit: (form: FormDefinitionSummary) => void;
  onPreview: (form: FormDefinitionSummary) => void;
  onPublish: (form: FormDefinitionSummary) => void;
  onRetire: (form: FormDefinitionSummary) => void;
  pendingAction?: FormTablePendingAction;
};

function FormTableActions({
  form,
  options,
}: {
  form: FormDefinitionSummary;
  options: FormTableOptions;
}) {
  const pending = options.pendingAction?.definitionId === form.id
    ? options.pendingAction.action
    : undefined;
  const hasVersion = Boolean(
    form.latestVersionId && form.latestVersionRowVersion !== null,
  );
  const actionPending = Boolean(options.pendingAction);
  const actions: ActionMenuItem[] = [
    {
      id: "edit",
      label: "Edit",
      disabled:
        !options.canUpdate
        || form.latestStatus !== "DRAFT"
        || actionPending,
      onAction: () => options.onEdit(form),
    },
    {
      id: "preview",
      label: pending === "preview" ? "Previewing…" : "Preview",
      disabled: actionPending,
      onAction: () => options.onPreview(form),
    },
    {
      id: "publish",
      label: pending === "publish" ? "Publishing…" : "Publish",
      disabled:
        !options.canPublish
        || form.latestStatus !== "DRAFT"
        || !hasVersion
        || actionPending,
      onAction: () => options.onPublish(form),
    },
    {
      id: "retire",
      label: pending === "retire" ? "Retiring…" : "Retire",
      disabled:
        !options.canRetire
        || form.latestStatus !== "PUBLISHED"
        || !hasVersion
        || actionPending,
      destructive: true,
      onAction: () => options.onRetire(form),
    },
    {
      id: "clone",
      label: pending === "clone" ? "Cloning…" : "Clone",
      disabled:
        !options.canUpdate
        || form.latestStatus === "DRAFT"
        || !hasVersion
        || actionPending,
      onAction: () => options.onClone(form),
    },
  ];

  return (
    <div className="flex justify-start">
      <ActionMenu items={actions} label={`Actions for ${form.name}`} />
    </div>
  );
}

function formColumns(
  options: FormTableOptions,
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
    {
      accessorKey: "purpose",
      header: "Purpose",
      cell: ({ row }) => formPurposeOptions.find(
        (item) => item.value === row.original.purpose,
      )?.label ?? row.original.purpose,
    },
    {
      accessorKey: "latestVersion",
      header: "Latest version",
      cell: ({ row }) => `v${row.original.latestVersion}`,
    },
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
        <FormTableActions form={row.original} options={options} />
      ),
      header: "Actions",
      id: "actions",
    },
  ];
}

export function FormsTable({
  canCreate,
  canPublish,
  canRetire,
  canUpdate,
  emptyMessage,
  errorMessage,
  items,
  loading,
  onClone,
  onCreate,
  onEdit,
  onPageChange,
  onPageSizeChange,
  onPreview,
  onPublish,
  onRetire,
  page,
  pageSize,
  pendingAction,
  total,
  totalPages,
}: {
  canCreate: boolean;
  canPublish: boolean;
  canRetire: boolean;
  canUpdate: boolean;
  emptyMessage: string;
  errorMessage?: string;
  items: FormDefinitionSummary[];
  loading: boolean;
  onClone: (form: FormDefinitionSummary) => void;
  onCreate: () => void;
  onEdit: (form: FormDefinitionSummary) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onPreview: (form: FormDefinitionSummary) => void;
  onPublish: (form: FormDefinitionSummary) => void;
  onRetire: (form: FormDefinitionSummary) => void;
  page: number;
  pageSize: number;
  pendingAction?: FormTablePendingAction;
  total: number;
  totalPages: number;
}) {
  return (
    <DataTable
      columns={formColumns({
        canPublish,
        canRetire,
        canUpdate,
        onClone,
        onEdit,
        onPreview,
        onPublish,
        onRetire,
        pendingAction,
      })}
      data={items}
      emptyMessage={emptyMessage}
      renderExpandedRow={(form) => (
        <FormVersionsTable definitionId={form.id} />
      )}
      rowKey={(form) => form.id}
      footer={(
        <div className="space-y-3">
          {errorMessage ? (
            <p className="text-sm text-red-700" role="alert">
              {errorMessage}
            </p>
          ) : null}
          <Pagination
            disabled={loading}
            hasNextPage={page < totalPages}
            onNext={() => onPageChange(page + 1)}
            onPageSizeChange={onPageSizeChange}
            onPrevious={() => onPageChange(page - 1)}
            page={page}
            pageSize={pageSize}
            total={total}
          />
        </div>
      )}
      toolbar={{
        actions: (
          <GeneralButton disabled={!canCreate} onClick={onCreate} type="button">
            Create form
          </GeneralButton>
        ),
      }}
    />
  );
}
