"use client";

import type { ReactNode } from "react";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatLocalDateTime24 } from "@/lib/dateUtils";
import type { ApplicationSummary } from "@/modules/applications/ApplicationTypes";

type Props = {
  items: ApplicationSummary[];
  renderAction: (application: ApplicationSummary) => ReactNode;
};

function ProgressBar({ value }: { value: number }) {
  return (
    <div
      aria-label="Application completion"
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={value}
      className="h-2 min-w-24 overflow-hidden rounded-full bg-brand-cream"
      role="progressbar"
    >
      <div
        className="h-full rounded-full bg-brand-orange"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function applicationColumns(
  renderAction: Props["renderAction"],
): DataTableColumn<ApplicationSummary>[] {
  return [
    {
      accessorKey: "fundingOpportunityTitle",
      header: "Opportunity",
      cell: ({ row }) => (
        <span className="font-semibold text-brand-navy">
          {row.original.fundingOpportunityTitle}
          {row.original.reference ? (
            <small className="block font-normal">{row.original.reference}</small>
          ) : null}
        </span>
      ),
    },
    {
      accessorKey: "businessName",
      header: "Business",
      cell: ({ row }) => row.original.businessName ?? "Not selected",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <span>
          <StatusBadge status={row.original.publicStatus.label} />
          <small className="mt-1 block text-brand-navy/70">
            {row.original.publicStatus.description}
          </small>
        </span>
      ),
    },
    {
      accessorKey: "progressPercent",
      header: "Progress",
      cell: ({ row }) => <ProgressBar value={row.original.progressPercent} />,
    },
    {
      accessorKey: "updatedAt",
      header: "Last updated",
      cell: ({ row }) => formatLocalDateTime24(row.original.updatedAt),
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => renderAction(row.original),
    },
  ];
}

export function ApplicationsTable({ items, renderAction }: Props) {
  return (
    <div className="hidden overflow-hidden rounded-2xl border border-brand-navy/15 bg-brand-white shadow-sm md:block">
      <DataTable
        columns={applicationColumns(renderAction)}
        data={items}
        emptyMessage="No applications found"
        minWidth={900}
      />
    </div>
  );
}

export function ApplicationCards({ items, renderAction }: Props) {
  return (
    <div className="grid gap-3 md:absolute md:invisible">
      {items.map((application) => (
        <article
          className="rounded-2xl border border-brand-navy/15 bg-brand-white p-5 shadow-sm"
          key={application.id}
        >
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-bold text-brand-navy">
              {application.fundingOpportunityTitle}
            </h2>
            <StatusBadge status={application.publicStatus.label} />
          </div>
          <p className="mt-2 text-sm text-brand-navy/70">
            {application.publicStatus.description}
          </p>
          {application.reference ? (
            <p className="mt-1 text-xs text-brand-navy/60">
              {application.reference}
            </p>
          ) : null}
          <p className="mt-2 text-xs text-brand-navy/60">
            {application.businessName ?? "Business not selected"}
          </p>
          <p className="mt-1 text-xs text-brand-navy/60">
            Last saved {formatLocalDateTime24(application.updatedAt)}
          </p>
          <div className="mt-4">
            <ProgressBar value={application.progressPercent} />
          </div>
          <div className="mt-4">{renderAction(application)}</div>
        </article>
      ))}
    </div>
  );
}
