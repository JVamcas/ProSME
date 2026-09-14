"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

import {
  ActivateButton,
  AssignButton,
  DeactivateButton,
  EditButton,
} from "@/components/ui/action-buttons";
import { GeneralButton } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import type { FundingOpportunitySummary } from "@/modules/funding-opportunities/FundingOpportunityTypes";
import type {
  PublishedWorkflowOption,
  WorkflowDefinitionSummary,
  WorkflowOpportunityAssignment,
} from "@/modules/workflows/WorkflowTypes";
import { WorkflowAssignedFundingLinks } from "./WorkflowAssignedFundingLinks";

type PendingAction = {
  action: "activate" | "deactivate";
  id?: string;
};

type Props = {
  assignments?: WorkflowOpportunityAssignment[];
  canPublish: boolean;
  canRetire: boolean;
  canUpdate: boolean;
  canCreate: boolean;
  emptyMessage: string;
  items: WorkflowDefinitionSummary[];
  lifecycleError?: string;
  onActivate: (workflow: WorkflowDefinitionSummary) => void;
  onAssign?: (workflow: WorkflowDefinitionSummary) => void;
  onCreate: () => void;
  onDeactivate: (workflow: WorkflowDefinitionSummary) => void;
  onEdit: (workflow: WorkflowDefinitionSummary) => void;
  pendingAction?: PendingAction;
  opportunities?: FundingOpportunitySummary[];
  publishedWorkflows?: PublishedWorkflowOption[];
};

const updatedFormatter = new Intl.DateTimeFormat("en-NA", {
  dateStyle: "medium",
  timeStyle: "short",
});

function WorkflowDefinitionActions({
  options,
  workflow,
}: {
  options: Props;
  workflow: WorkflowDefinitionSummary;
}) {
  const isPending = options.pendingAction?.id === workflow.id;
  const canAssign = options.canUpdate
    && options.onAssign
    && options.publishedWorkflows?.some(
      (item) => item.definitionId === workflow.id,
    );
  return (
    <div className="flex items-center justify-start gap-1">
      {options.canUpdate ? (
        <EditButton
          onClick={() => options.onEdit(workflow)}
          title={`Edit ${workflow.name}`}
        />
      ) : null}
      {canAssign ? (
        <AssignButton
          onClick={() => options.onAssign?.(workflow)}
          title={`Assign funding to ${workflow.name}`}
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
      id: "assignedFunding",
      header: "Assigned funding",
      enableSorting: false,
      cell: ({ row }) => (
        <WorkflowAssignedFundingLinks
          assignments={options.assignments ?? []}
          opportunities={options.opportunities ?? []}
          publishedWorkflows={options.publishedWorkflows ?? []}
          workflow={row.original}
        />
      ),
    },
    {
      accessorKey: "updatedAt",
      header: "Updated",
      cell: ({ row }) =>
        updatedFormatter.format(new Date(row.original.updatedAt)),
    },
    {
      id: "action",
      header: "Actions",
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
        minWidth={980}
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
