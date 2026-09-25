"use client";

import { Search } from "lucide-react";
import { useState } from "react";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { DataTableFilter } from "@/components/ui/data-table-filter";
import { Input } from "@/shared/ui/FormPrimitives";
import { Pagination } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import { useAdminApplications } from "@/modules/applications/ApplicationHooks";
import type {
  AdminApplicationListRow,
  AdminApplicationStatusFilter,
} from "@/modules/applications/ApplicationTypes";
import { formatNAD } from "@/components/ui/money-field";
import { formatLocalDateTime24 } from "@/lib/dateUtils";
import { ArrowLink } from "@/components/ui/links";

const statuses: Array<{
  label: string;
  value: AdminApplicationStatusFilter;
}> = [
  { label: "All", value: "all" },
  { label: "Submitted", value: "submitted" },
  { label: "Under review", value: "under-review" },
  { label: "Action required", value: "action-required" },
  { label: "Outcome available", value: "outcome-available" },
  { label: "Closed", value: "closed" },
];

const columns: DataTableColumn<AdminApplicationListRow>[] = [
  {
    accessorKey: "reference",
    header: "Application",
    cell: ({ row }) => (
      <ArrowLink href={`/admin/applications/${row.original.applicationId}`}>
        {row.original.reference}
      </ArrowLink>
    ),
  },
  {
    accessorKey: "businessName",
    header: "Applicant",
    cell: ({ row }) => (
      <div>
        <p className="font-semibold text-brand-navy">
          {row.original.businessName ?? "Business not selected"}
        </p>
        <p className="mt-1 text-[11px] text-brand-navy/55">
          {row.original.applicantName}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "fundingCallTitle",
    header: "Opportunity",
  },
  {
    accessorKey: "internalStatus",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.internalStatus} />,
  },
  {
    accessorKey: "submittedAt",
    header: "Submitted",
    cell: ({ row }) => formatLocalDateTime24(row.original.submittedAt),
  },

];

function StatusTabs({
  onChange,
  status,
}: {
  onChange: (status: AdminApplicationStatusFilter) => void;
  status: AdminApplicationStatusFilter;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-brand-navy/10">
      {statuses.map((item) => (
        <button
          className={cn(
            "whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold",
            status === item.value
              ? "border-brand-orange text-brand-navy"
              : "border-transparent text-brand-navy/55",
          )}
          key={item.value}
          onClick={() => onChange(item.value)}
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function ApplicationsTable() {
  const [status, setStatus] = useState<AdminApplicationStatusFilter>("all");
  const [draftSearch, setDraftSearch] = useState("");
  const [draftStage, setDraftStage] = useState("");
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("");
  const [cursors, setCursors] = useState<string[]>([]);
  const applications = useAdminApplications({
    after: cursors.at(-1),
    limit: 25,
    search: search || undefined,
    stage: stage || undefined,
    status,
  });
  const applyFilters = () => {
    setSearch(draftSearch.trim());
    setStage(draftStage.trim());
    setCursors([]);
  };
  const clearFilters = () => {
    setDraftSearch("");
    setDraftStage("");
    setSearch("");
    setStage("");
    setCursors([]);
  };
  const changeStatus = (next: AdminApplicationStatusFilter) => {
    setStatus(next);
    setCursors([]);
  };
  const emptyMessage = applications.isPending
    ? "Loading applications…"
    : applications.isError
      ? applications.error.message
      : "No submitted applications match these filters.";

  return (
    <section className="overflow-hidden rounded-2xl border border-brand-navy/10 bg-white shadow-sm p-4">
      <StatusTabs onChange={changeStatus} status={status} />
      <div className="py-4 px-1">
        <DataTableFilter
          defaultExpanded={false}
          description="Filter the safe application list projection."
          onApply={applyFilters}
          onClear={clearFilters}
          title="Application filters"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-brand-orange" />
              <Input
                aria-label="Search applications"
                className="pl-10"
                onChange={(event) => setDraftSearch(event.target.value)}
                placeholder="Search reference, applicant, business or opportunity"
                value={draftSearch}
              />
            </div>
            <Input
              aria-label="Filter by workflow stage"
              onChange={(event) => setDraftStage(event.target.value)}
              placeholder="Workflow stage"
              value={draftStage}
            />
          </div>
        </DataTableFilter>
      </div>
      <DataTable
        columns={columns}
        data={applications.data?.items ?? []}
        emptyMessage={emptyMessage}
        minWidth={1120}
      />
      <Pagination
        disabled={applications.isFetching}
        hasNextPage={Boolean(applications.data?.nextCursor)}
        onNext={() => {
          if (applications.data?.nextCursor) {
            setCursors((current) => [
              ...current,
              applications.data!.nextCursor!,
            ]);
          }
        }}
        onPrevious={() => setCursors((current) => current.slice(0, -1))}
        page={cursors.length + 1}
        pageSize={25}
        total={applications.data?.total ?? 0}
      />
    </section>
  );
}
