"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/ui/data-table";
import { Input } from "@/components/ui/form-controls";
import { useApplications } from "@/modules/applications/ApplicationHooks";
import type { AdminApplication } from "@/modules/applications/ApplicationTypes";

const columns: DataTableColumn<AdminApplication>[] = [
  {
    accessorKey: "id",
    header: "Reference",
    cell: ({ row }) => (
      <span className="font-bold text-navy">{row.original.id}</span>
    ),
  },
  {
    accessorKey: "business",
    header: "Business",
    cell: ({ row }) => (
      <div>
        <p className="font-semibold text-slate-800">
          {row.original.business}
        </p>
        <p className="mt-0.5 text-[10px] text-slate-400">
          {row.original.applicant}
        </p>
      </div>
    ),
  },
  { accessorKey: "sector", header: "Sector" },
  { accessorKey: "region", header: "Region" },
  {
    accessorKey: "requested",
    header: "Requested",
    cell: ({ row }) => `N$${row.original.requested.toLocaleString("en-NA")}`,
  },
  {
    accessorKey: "submitted",
    header: "Submitted",
    cell: ({ row }) =>
      new Intl.DateTimeFormat("en-NA", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(row.original.submitted)),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    id: "action",
    header: "",
    enableSorting: false,
    cell: ({ row }) => (
      <Link
        href={`/admin/applications/${row.original.id}`}
        className="grid size-8 place-items-center rounded-full border border-slate-200 text-slate-400 hover:border-orange hover:text-navy"
        aria-label={`View ${row.original.id}`}
      >
        <ChevronRight className="size-4 text-brand-orange" />
      </Link>
    ),
  },
];

export function ApplicationsTable() {
  const [search, setSearch] = useState("");
  const applications = useApplications();
  const data = useMemo(() => {
    const items = applications.data ?? [];
    const query = search.trim().toLowerCase();
    if (!query) {
      return items;
    }

    return items.filter((item) =>
      [
        item.id,
        item.applicant,
        item.business,
        item.sector,
        item.region,
        item.status,
      ].some((value) => value.toLowerCase().includes(query)),
    );
  }, [applications.data, search]);

  const emptyMessage = applications.isPending
    ? "Loading applications…"
    : applications.isError
      ? applications.error.message
      : "No applications match your search";

  return (
    <section
      id="applications"
      className="rounded-xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-bold text-navy">Recent applications</h2>
          <p className="mt-1 text-xs text-slate-400">
            Select a record to view the submitted information.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-brand-orange" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search applications"
            className="h-10 pl-9"
            aria-label="Search applications"
          />
        </div>
      </div>
      <DataTable
        columns={columns}
        data={data}
        minWidth={900}
        emptyMessage={emptyMessage}
        footer={
          <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4 text-xs text-slate-400">
            <span>{data.length} applications shown</span>
            <span>
              {applications.isFetching ? "Refreshing…" : "Current records"}
            </span>
          </div>
        }
      />
    </section>
  );
}
