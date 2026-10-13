"use client";

import { ApplicationExportActions } from "./ApplicationExportActions";
import { useAdminApplicationFilterOptions } from "../useAdminApplicationTools";
import { GeneralButton } from "@/components/ui/button";
import { useState } from "react";

import { DataTable, type DataTableColumn } from "@/shared/ui/DataTable";
import { DataTableFilter } from "@/components/ui/data-table-filter";
import { Pagination } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAdminApplications } from "@/modules/applications/ui/useApplications";
import type { AdminApplicationListRow } from "@/modules/applications/ApplicationTypes";
import { formatLocalDateTime24 } from "@/lib/dateUtils";
import { ApplicationNavigationLink } from "../ApplicationNavigationLink";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { adminApplicationFormSchema } from "../../api/AdminApplicationSchemas";
import { ApplicationFilterFields } from "./ApplicationFilterFields";
import { z } from "zod";

type FilterInput = z.input<typeof adminApplicationFormSchema>;
type Filters = z.output<typeof adminApplicationFormSchema>;

const defaultFilters: FilterInput = {
  fundingCallId: [],
  status: [],
  search: "",
  stage: [],
  ageMin: "",
  ageMax: "",
  gender: [],
  region: [],
  sector: [],
  submittedFrom: "",
  submittedTo: "",
};

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
    cell: ({ row }) => (
      <StatusBadge
        status={row.original.processingStatus ?? row.original.applicantStatus}
      />
    ),
  },
  {
    accessorKey: "submittedAt",
    header: "Submitted",
    cell: ({ row }) => formatLocalDateTime24(row.original.submittedAt),
  },
];

export function StaffApplicationsTable({
  initialFilters,
  canExport = false,
}: {
  canExport?: boolean;
  initialFilters?: Filters;
}) {
  const options = useAdminApplicationFilterOptions();
  const initialValues = { ...defaultFilters, ...initialFilters };
  const form = useForm<FilterInput, unknown, Filters>({
    resolver: zodResolver(adminApplicationFormSchema),
    defaultValues: initialValues,
  });
  const [filters, setFilters] = useState<Filters>(
    initialFilters ?? { status: "all" },
  );
  const [cursors, setCursors] = useState<string[]>([]);
  const applications = useAdminApplications({
    ...filters,
    after: cursors.at(-1),
    limit: 25,
  });
  const applyFilters = (values: Filters) => {
    const applied = { ...values };
    if (values.submittedFrom !== initialValues.submittedFrom) {
      delete applied.submittedAfter;
    }
    if (values.submittedTo !== initialValues.submittedTo) {
      delete applied.submittedBefore;
    }
    setFilters(applied);
    setCursors([]);
  };
  const clearFilters = () => {
    form.reset(defaultFilters);
    setFilters({ status: "all" });
    setCursors([]);
  };
  const emptyMessage = applications.isPending
    ? "Loading applications…"
    : applications.isError
      ? applications.error.message
      : "No submitted applications match these filters.";

  return (
    <section className="overflow-hidden rounded-2xl border border-brand-navy/10 bg-white shadow-sm p-4">
      <div className="py-4 px-1">
        <DataTableFilter
          defaultExpanded
          description="Filter applications by funding call, applicant, business, workflow stage, status and submission date."
          onApply={() => void form.handleSubmit(applyFilters)()}
          onClear={clearFilters}
          title="Application filters"
        >
          <ApplicationFilterFields
            register={form.register}
            control={form.control}
            options={options.data}
            optionsPending={options.isPending}
          />
          {options.isError ? (
            <div
              role="alert"
              className="col-span-full flex items-center gap-3 text-sm text-red-700"
            >
              <span>
                Funding calls and workflow stages could not be loaded.
              </span>
              <GeneralButton
                type="button"
                variant="ghost"
                onClick={() => void options.refetch()}
              >
                Retry
              </GeneralButton>
            </div>
          ) : null}
          {Object.values(form.formState.errors).map((error, index) => (
            <p className="text-sm text-red-700" role="alert" key={index}>
              {error.message}
            </p>
          ))}
        </DataTableFilter>
      </div>
      <DataTable
        toolbar={
          canExport
            ? {
                description: "Export all results matching the applied filters.",
                actions: <ApplicationExportActions filters={filters} />,
              }
            : undefined
        }
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
