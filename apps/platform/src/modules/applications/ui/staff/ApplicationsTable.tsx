"use client";

import { Search } from "lucide-react";
import { useState } from "react";

import { DataTable, type DataTableColumn } from "@/shared/ui/DataTable";
import { DataTableFilter } from "@/components/ui/data-table-filter";
import { Input } from "@/shared/ui/FormPrimitives";
import { Pagination } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import { useAdminApplications } from "@/modules/applications/ui/useApplications";
import type {
  AdminApplicationListRow,
  AdminApplicationStatusFilter,
} from "@/modules/applications/ApplicationTypes";
import { formatLocalDateTime24 } from "@/lib/dateUtils";
import { ApplicationNavigationLink } from "../ApplicationNavigationLink";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { adminApplicationListSchema } from "../../AdminApplicationSchemas";
import { z } from "zod";

const filterSchema = adminApplicationListSchema.pick({
  search: true,
  stage: true,
});
type Filters = z.infer<typeof filterSchema>;

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
    header: "Application ID",
    cell: ({ row }) => (
      <ApplicationNavigationLink
        applicationId={row.original.applicationId}
        audience="staff"
        arrow
      >
        {row.original.applicationId}
      </ApplicationNavigationLink>
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
    header: "Funding Call",
  },
  {
    accessorKey: "applicantStatus",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.processingStatus ?? row.original.applicantStatus} />,
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
  const form = useForm<Filters>({
    resolver: zodResolver(filterSchema),
    defaultValues: { search: "", stage: "" },
  });
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
  const applyFilters = (values: Filters) => {
    setSearch(values.search?.trim() ?? "");
    setStage(values.stage?.trim() ?? "");
    setCursors([]);
  };
  const clearFilters = () => {
    form.reset();
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
          onApply={() => void form.handleSubmit(applyFilters)()}
          onClear={clearFilters}
          title="Application filters"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-brand-orange" />
              <Input
                aria-label="Search applications"
                className="pl-10"
                placeholder="Search reference, applicant, business or opportunity"
                {...form.register("search")}
              />
            </div>
            <Input
              aria-label="Filter by workflow stage"
              placeholder="Workflow stage"
              {...form.register("stage")}
            />
          </div>
          {Object.values(form.formState.errors).map((error, index) => (
            <p className="text-sm text-red-700" role="alert" key={index}>
              {error.message}
            </p>
          ))}
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
