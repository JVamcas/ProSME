"use client";

import type { ReactNode } from "react";
import Link from "next/link";

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

function applicationColumns(): DataTableColumn<ApplicationSummary>[] {
  return [
    {
      accessorKey: "fundingOpportunityTitle",
      header: "Opportunity",
      cell: ({ row }) => (
        <Link
          className="font-semibold text-brand-orange hover:text-brand-gold hover:underline"
          href={`/portal/applications/${row.original.id}`}
        >
          {row.original.fundingOpportunityTitle}
        </Link>
      ),
    },
    {
      accessorKey: "businessName",
      header: "Business Entity",
      cell: ({ row }) => row.original.businessName ?? "--",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge status={row.original.publicStatus.label} />
      ),
    },
    {
      accessorKey: "progressPercent",
      header: "Progress",
      cell: ({ row }) => <ProgressBar value={row.original.progressPercent} />,
    },
    {
      accessorKey: "submittedAt",
      header: "Submitted",
      cell: ({ row }) => formatLocalDateTime24(row.original.submittedAt),
    },
    {
      accessorKey: "updatedAt",
      header: "Last updated",
      cell: ({ row }) => formatLocalDateTime24(row.original.updatedAt),
    },
  ];
}

export function ApplicationsTable({ items }: Pick<Props, "items">) {
  return (
    <div className="hidden overflow-hidden rounded-2xl border border-brand-navy/15 bg-brand-white shadow-sm md:block">
      <DataTable
        columns={applicationColumns()}
        data={items}
        emptyMessage="No applications found"
        minWidth={760}
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
              <Link
                className="hover:text-brand-orange hover:underline"
                href={`/portal/applications/${application.id}`}
              >
                {application.fundingOpportunityTitle}
              </Link>
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
