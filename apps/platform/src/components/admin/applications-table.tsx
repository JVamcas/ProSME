"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { StatusBadge } from "@/components/admin/status-badge";
import { createDataTableColumnHelper, DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/form-controls";
import { useApplications } from "@/modules/applications/application.hooks";
import type { AdminApplication } from "@/modules/applications/application.types";

const helper = createDataTableColumnHelper<AdminApplication>();
const columns = helper.columns([
  helper.accessor("id", {
    header: "Reference",
    cell: (info) => (
      <span className="font-bold text-navy">{info.getValue()}</span>
    ),
  }),
  helper.accessor("business", {
    header: "Business",
    cell: (info) => (
      <div>
        <p className="font-semibold text-slate-800">{info.getValue()}</p>
        <p className="mt-0.5 text-[10px] text-slate-400">
          {info.row.original.applicant}
        </p>
      </div>
    ),
  }),
  helper.accessor("sector", { header: "Sector" }),
  helper.accessor("region", { header: "Region" }),
  helper.accessor("requested", {
    header: "Requested",
    cell: (info) => `N$${info.getValue().toLocaleString("en-NA")}`,
  }),
  helper.accessor("submitted", {
    header: "Submitted",
    cell: (info) =>
      new Intl.DateTimeFormat("en-NA", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(info.getValue())),
  }),
  helper.accessor("status", {
    header: "Status",
    cell: (info) => <StatusBadge status={info.getValue()} />,
  }),
  helper.display({
    id: "action",
    header: "",
    cell: (info) => (
      <Link
        href={`/admin/applications/${info.row.original.id}`}
        className="grid size-8 place-items-center rounded-full border border-slate-200 text-slate-400 hover:border-orange hover:text-navy"
        aria-label={`View ${info.row.original.id}`}
      >
        <ChevronRight className="size-4" />
      </Link>
    ),
  }),
]);

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
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
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
            <span>{applications.isFetching ? "Refreshing…" : "Current records"}</span>
          </div>
        }
      />
    </section>
  );
}
