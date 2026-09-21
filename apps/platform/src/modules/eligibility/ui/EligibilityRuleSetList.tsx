"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { GeneralButton } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { DraggableDialog } from "@/components/ui/draggable-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatLocalDateTime24 } from "@/lib/dateUtils";
import { DataTablePagination } from "@/shared/ui/DataTablePagination";
import type { EligibilityRuleSetSummary } from "../api/EligibilityRuleSetTransport";
import {
  useCreateEligibilityRuleSet,
  useEligibilityRuleSets,
} from "../EligibilityRuleSetHooks";
import { EligibilityRuleSetCreateForm } from "./EligibilityRuleSetCreateForm";

const columns: DataTableColumn<EligibilityRuleSetSummary>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <Link
          className="font-semibold text-brand-orange underline"
          href={`/admin/settings/eligibility-rulesets/${row.original.id}`}
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
    accessorKey: "latestVersion",
    header: "Version",
    cell: ({ row }) => `v${row.original.latestVersion}`,
  },
  {
    accessorKey: "latestStatus",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.latestStatus} />,
  },
  { accessorKey: "ruleCount", header: "Rules" },
  {
    accessorKey: "updatedAt",
    header: "Updated",
    cell: ({ row }) => formatLocalDateTime24(row.original.updatedAt),
  },
];

export function EligibilityRuleSetList({ canCreate }: { canCreate: boolean }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const query = useEligibilityRuleSets(page, pageSize);
  const create = useCreateEligibilityRuleSet();

  return (
    <>
      <DataTable
        columns={columns}
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
        rowKey={(ruleset) => ruleset.id}
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
        isOpen={creating && canCreate}
        onClose={() => setCreating(false)}
        title="Create eligibility ruleset"
      >
        <EligibilityRuleSetCreateForm
          mutation={create}
          onCreated={(id) => {
            setCreating(false);
            router.push(`/admin/settings/eligibility-rulesets/${id}`);
          }}
        />
      </DraggableDialog>
    </>
  );
}
