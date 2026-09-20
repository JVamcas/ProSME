"use client";

import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { GeneralButton } from "@/components/ui/button";
import type { FormDefinitionSummary } from "@/modules/forms/FormTypes";
import {
  CreateDraftButton,
  EditButton,
  PreviewButton,
  PublishButton,
  RetireButton,
} from "@/components/ui/action-buttons";
import { formatLocalDateTime24 } from "@/lib/dateUtils";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataTablePagination } from "@/shared/ui/DataTablePagination";

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
  return (
    <div className="flex items-center justify-start gap-1">
      <EditButton
        disabled={
          !options.canUpdate
          || form.latestStatus !== "DRAFT"
          || Boolean(options.pendingAction)
        }
        onClick={() => options.onEdit(form)}
        title={`Edit ${form.name}`}
      />
      <PreviewButton
        disabled={Boolean(options.pendingAction) && pending !== "preview"}
        isLoading={pending === "preview"}
        onClick={() => options.onPreview(form)}
        title={`Preview ${form.name}`}
      />
      <PublishButton
        disabled={
          !options.canPublish
          || form.latestStatus !== "DRAFT"
          || !hasVersion
          || Boolean(options.pendingAction) && pending !== "publish"
        }
        isLoading={pending === "publish"}
        onClick={() => options.onPublish(form)}
        title={`Publish ${form.name}`}
      />
      <RetireButton
        disabled={
          !options.canRetire
          || form.latestStatus !== "PUBLISHED"
          || !hasVersion
          || Boolean(options.pendingAction) && pending !== "retire"
        }
        isLoading={pending === "retire"}
        onClick={() => options.onRetire(form)}
        title={`Retire ${form.name}`}
      />
      <CreateDraftButton
        disabled={
          !options.canUpdate
          || form.latestStatus === "DRAFT"
          || !hasVersion
          || Boolean(options.pendingAction) && pending !== "clone"
        }
        isLoading={pending === "clone"}
        onClick={() => options.onClone(form)}
        title={`Create new draft for ${form.name}`}
      />
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
      footer={(
        <div className="space-y-3">
          {errorMessage ? (
            <p className="text-sm text-red-700" role="alert">
              {errorMessage}
            </p>
          ) : null}
          <DataTablePagination
            disabled={loading}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            page={page}
            pageSize={pageSize}
            total={total}
            totalPages={totalPages}
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
