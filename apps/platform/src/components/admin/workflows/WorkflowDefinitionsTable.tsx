"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

import {
  ActivateButton,
  DeactivateButton,
  EditButton,
} from "@/components/ui/action-buttons";
import { GeneralButton } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import type { WorkflowDefinitionSummary } from "@/modules/workflows/WorkflowTypes";

type PendingAction = {
  action: "activate" | "deactivate";
  id?: string;
};

type Props = {
  canPublish: boolean;
  canRetire: boolean;
  canUpdate: boolean;
  canCreate: boolean;
  emptyMessage: string;
  items: WorkflowDefinitionSummary[];
  lifecycleError?: string;
  onActivate: (workflow: WorkflowDefinitionSummary) => void;
  onCreate: () => void;
  onDeactivate: (workflow: WorkflowDefinitionSummary) => void;
  onEdit: (workflow: WorkflowDefinitionSummary) => void;
  pendingAction?: PendingAction;
};

function WorkflowDefinitionActions({
  options,
  workflow,
}: {
  options: Props;
  workflow: WorkflowDefinitionSummary;
}) {
  const isPending = options.pendingAction?.id === workflow.id;
  return (
    <div className="flex items-center justify-end gap-1">
      {options.canUpdate ? (
        <EditButton
          onClick={() => options.onEdit(workflow)}
          title={`Edit ${workflow.name}`}
        />
      ) : null}
      {options.canPublish && workflow.latestStatus === "DRAFT" ? (
        <ActivateButton
          disabled={Boolean(options.pendingAction) && !isPending}
          isLoading={isPending && options.pendingAction?.action === "activate"}
          onClick={() => options.onActivate(workflow)}
          title={`Activate ${workflow.name}`}
        />
      ) : null}
      {options.canRetire && workflow.latestStatus === "PUBLISHED" ? (
        <DeactivateButton
          disabled={Boolean(options.pendingAction) && !isPending}
          isLoading={isPending && options.pendingAction?.action === "deactivate"}
          onClick={() => options.onDeactivate(workflow)}
          title={`Deactivate ${workflow.name}`}
        />
      ) : null}
    </div>
  );
}

function workflowColumns(options: Props) {
  return [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <Link
          className="block hover:text-brand-orange"
          href={`/admin/workflows/${row.original.id}`}
        >
          <strong className="text-sm text-brand-orange">{row.original.name}</strong>
          <span className="mt-1 block text-[10px] text-brand-navy/55">
            {row.original.code}
          </span>
        </Link>
      ),
    },
    {
      accessorKey: "latestVersion",
      header: "Version",
      cell: ({ row }) => `v${row.original.latestVersion}`,
    },
    {
      accessorKey: "latestStatus",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.latestStatus} />,
    },
    {
      id: "action",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <WorkflowDefinitionActions options={options} workflow={row.original} />
      ),
    },
  ] satisfies DataTableColumn<WorkflowDefinitionSummary>[];
}

export function WorkflowDefinitionsTable(props: Props) {
  return (
    <section className="overflow-hidden rounded-2xl border border-brand-navy/15 bg-brand-white shadow-sm">
      <DataTable
        columns={workflowColumns(props)}
        data={props.items}
        emptyMessage={props.emptyMessage}
        footer={
          props.lifecycleError ? (
            <p
              className="border-t border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700"
              role="alert"
            >
              {props.lifecycleError}
            </p>
          ) : null
        }
        minWidth={720}
        toolbar={{
          title: "",
          description: "",
          actions: props.canCreate ? (
            <GeneralButton onClick={props.onCreate} size="sm">
              <Plus className="size-4" />
              Create workflow
            </GeneralButton>
          ) : null,
        }}
      />
    </section>
  );
}
