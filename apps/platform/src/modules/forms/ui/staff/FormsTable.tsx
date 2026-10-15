"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { DataTable, type DataTableColumn } from "@/shared/ui/DataTable";
import { GeneralButton } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { formPurposeOptions } from "@/modules/forms/FormTypes";
import type { FormDefinitionSummary } from "@/modules/forms/FormTypes";
import { formatLocalDateTime24 } from "@/lib/dateUtils";
import { StatusBadge } from "@/components/ui/status-badge";
import { FormVersionsTable } from "@/modules/forms/ui/FormVersionsTable";
import { ActionMenu, type ActionMenuItem } from "@/shared/ui/ActionMenu";
import type { FormVersionActionOptions } from "./FormVersionActions";

type FormTableOptions = FormVersionActionOptions & {
  onEdit: (form: FormDefinitionSummary) => void;
};

function FormTableActions({
  form,
  options,
}: {
  form: FormDefinitionSummary;
  options: FormTableOptions;
}) {
  const actions: ActionMenuItem[] = [
    {
      id: "edit",
      label: "Edit",
      disabled:
        !options.canUpdate ||
        form.latestStatus !== "DRAFT" ||
        Boolean(options.pendingAction),
      onAction: () => options.onEdit(form),
    },
  ];
  return <ActionMenu items={actions} label={`Actions for ${form.name}`} />;
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
      cell: ({ row }) =>
        formPurposeOptions.find((item) => item.value === row.original.purpose)
          ?.label ?? row.original.purpose,
    },
    {
      accessorKey: "latestVersion",
      header: "Latest version",
      cell: ({ row }) =>
        row.original.latestVersionId ? (
          <Link
            className="text-brand-orange underline"
            href={`/admin/settings/forms/${row.original.id}?versionId=${row.original.latestVersionId}`}
          >
            v{row.original.latestVersion}
          </Link>
        ) : (
          "—"
        ),
    },
    {
      accessorKey: "latestStatus",
      header: "Status",

      cell: ({ row }) =>
        row.original.latestStatus ? (
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
  searchForm,
  total,
  totalPages,
}: FormTableOptions & {
  canCreate: boolean;
  emptyMessage: string;
  errorMessage?: string;
  items: FormDefinitionSummary[];
  loading: boolean;
  onCreate: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  page: number;
  pageSize: number;
  searchForm: ReactNode;
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
        <FormVersionsTable
          definitionId={form.id}
          actions={{
            canPublish,
            canRetire,
            canUpdate,
            onClone,
            onPreview,
            onPublish,
            onRetire,
            pendingAction,
          }}
        />
      )}
      rowKey={(form) => form.id}
      footer={
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
      }
      toolbar={{
        filters: searchForm,
        actions: (
          <GeneralButton
            size="compact"
            disabled={!canCreate}
            onClick={onCreate}
            type="button"
          >
            Create form
          </GeneralButton>
        ),
      }}
    />
  );
}
