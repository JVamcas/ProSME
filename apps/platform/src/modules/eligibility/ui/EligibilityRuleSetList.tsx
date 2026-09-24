"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  CloneButton,
  EditButton,
  PublishButton,
} from "@/components/ui/action-buttons";
import { GeneralButton } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { DraggableDialog } from "@/components/ui/draggable-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatLocalDateTime24 } from "@/lib/dateUtils";
import { DataTablePagination } from "@/shared/ui/DataTablePagination";
import type { EligibilityRuleSetSummary } from "../api/EligibilityRuleSetTransport";
import {
  useCreateEligibilityRuleSet,
  useEligibilityRuleSets,
  useEligibilityRuleSetLifecycle,
  useUpdateEligibilityRuleSetDefinition,
} from "../EligibilityRuleSetHooks";
import { EligibilityRuleSetCreateForm } from "./EligibilityRuleSetCreateForm";

function RuleSetActions({
  canPublish,
  canUpdate,
  onEdit,
  ruleSet,
}: {
  canPublish: boolean;
  canUpdate: boolean;
  onEdit: (ruleSet: EligibilityRuleSetSummary) => void;
  ruleSet: EligibilityRuleSetSummary;
}) {
  const lifecycle = useEligibilityRuleSetLifecycle(ruleSet.id);
  const [confirmingPublish, setConfirmingPublish] = useState(false);
  async function run(
    input:
      | { action: "CLONE"; sourceVersionId: string }
      | {
          action: "PUBLISH";
          expectedRowVersion: number;
          versionId: string;
        },
  ) {
    try {
      await lifecycle.mutateAsync(input);
      return true;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to update ruleset.",
      );
      return false;
    }
  }
  return (
    <>
      <div className="flex gap-1">
        <EditButton
          disabled={!canUpdate}
          onClick={() => onEdit(ruleSet)}
          title={`Edit ${ruleSet.name}`}
        />
        <CloneButton
          disabled={!canUpdate || ruleSet.status === "DRAFT"}
          isLoading={lifecycle.isPending}
          onClick={() => void run({
            action: "CLONE",
            sourceVersionId: ruleSet.versionId,
          })}
          title={`Clone ${ruleSet.name}`}
        />
        <PublishButton
          disabled={
            !canPublish
            || ruleSet.status !== "DRAFT"
            || !ruleSet.fundingCalls.length
          }
          isLoading={lifecycle.isPending}
          onClick={() => setConfirmingPublish(true)}
          title={`Publish ${ruleSet.name}`}
        />
      </div>
      <ConfirmationDialog
        confirmText="Publish version"
        errorMessage={lifecycle.error?.message}
        isLoading={lifecycle.isPending}
        isOpen={confirmingPublish}
        loadingText="Publishing…"
        message={`Publish ${ruleSet.name} version ${ruleSet.version}? It will become available for use by its funding call.`}
        onCancel={() => setConfirmingPublish(false)}
        onConfirm={() => void run({
          action: "PUBLISH",
          expectedRowVersion: ruleSet.versionRowVersion,
          versionId: ruleSet.versionId,
        }).then((published) => {
          if (published) setConfirmingPublish(false);
        })}
        title="Publish eligibility ruleset"
      />
    </>
  );
}

function columns(
  canPublish: boolean,
  canUpdate: boolean,
  onEdit: (ruleSet: EligibilityRuleSetSummary) => void,
): DataTableColumn<EligibilityRuleSetSummary>[] {
  return [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <Link
          className="font-semibold text-brand-orange underline"
          href={`/admin/settings/eligibility-rulesets/${row.original.id}?versionId=${row.original.versionId}`}
        >
          {row.original.name}
        </Link>
        <span>{row.original.code}</span>
      </div>
    ),
  },
  {
    accessorKey: "fundingCalls",
    header: "Funding Call",
    cell: ({ row }) =>
      row.original.fundingCalls.length ? (
        <div className="flex flex-col gap-1">
          {row.original.fundingCalls.map((call) => (
            <Link
              className="font-semibold text-brand-orange underline"
              href={`/admin/funding-calls?fundingCallId=${call.id}`}
              key={call.id}
            >
              {call.title}
            </Link>
          ))}
        </div>
      ) : (
        <span className="text-brand-navy/55">Not bound</span>
      ),
  },
  {
    accessorKey: "version",
    header: "Version",
    cell: ({ row }) => `v${row.original.version}`,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  { accessorKey: "ruleCount", header: "Rules" },
  {
    accessorKey: "updatedAt",
    header: "Updated",
    cell: ({ row }) => formatLocalDateTime24(row.original.updatedAt),
  },
  {
    id: "actions",
    header: "Actions",
    enableSorting: false,
    cell: ({ row }) => (
      <RuleSetActions
        canPublish={canPublish}
        canUpdate={canUpdate}
        onEdit={onEdit}
        ruleSet={row.original}
      />
    ),
  },
  ];
}

export function EligibilityRuleSetList({
  canCreate,
  canPublish,
  canUpdate,
}: {
  canCreate: boolean;
  canPublish: boolean;
  canUpdate: boolean;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<EligibilityRuleSetSummary>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const query = useEligibilityRuleSets(page, pageSize);
  const create = useCreateEligibilityRuleSet();
  const updateDefinition = useUpdateEligibilityRuleSetDefinition(editing?.id);

  return (
    <>
      <DataTable
        columns={columns(canPublish, canUpdate, setEditing)}
        data={query.data?.items ?? []}
        emptyMessage={
          query.isPending
            ? "Loading eligibility rulesets…"
            : (query.error?.message ?? "No eligibility rulesets configured.")
        }
        footer={
          <DataTablePagination
            disabled={query.isFetching}
            onPageChange={setPage}
            onPageSizeChange={(value) => {
              setPageSize(value);
              setPage(1);
            }}
            page={query.data?.page ?? page}
            pageSize={query.data?.pageSize ?? pageSize}
            total={query.data?.total ?? 0}
            totalPages={query.data?.totalPages ?? 0}
          />
        }
        rowKey={(ruleset) => ruleset.versionId}
        toolbar={{
          actions: (
            <GeneralButton
              disabled={!canCreate}
              onClick={() => setCreating(true)}
            >
              Create ruleset
            </GeneralButton>
          ),
        }}
      />
      <DraggableDialog
        isOpen={(creating && canCreate) || Boolean(editing && canUpdate)}
        onClose={() => {
          setCreating(false);
          setEditing(undefined);
        }}
        title={editing
          ? "Edit eligibility ruleset"
          : "Create eligibility ruleset"}
      >
        <EligibilityRuleSetCreateForm
          initialValues={editing ? {
            code: editing.code,
            description: editing.description,
            name: editing.name,
          } : undefined}
          key={editing?.id ?? "create"}
          mutation={editing ? updateDefinition : create}
          onSaved={(id) => {
            if (!editing) {
              router.push(`/admin/settings/eligibility-rulesets/${id}`);
            }
            setCreating(false);
            setEditing(undefined);
          }}
        />
      </DraggableDialog>
    </>
  );
}
