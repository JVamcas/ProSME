"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownUp, ChevronRight, Search } from "lucide-react";
import { createColumnHelper, createSortedRowModel, rowSortingFeature, tableFeatures, useTable } from "@tanstack/react-table";
import { adminApplications, type AdminApplication } from "@/data/admin-applications";
import { StatusBadge } from "@/components/admin/status-badge";
import { Input } from "@/components/ui/form-controls";

const features = tableFeatures({ rowSortingFeature, sortedRowModel: createSortedRowModel() });
const helper = createColumnHelper<typeof features, AdminApplication>();
const columns = helper.columns([
  helper.accessor("id", { header: "Reference", cell: info => <span className="font-bold text-navy">{info.getValue()}</span> }),
  helper.accessor("business", { header: "Business", cell: info => <div><p className="font-semibold text-slate-800">{info.getValue()}</p><p className="mt-0.5 text-[10px] text-slate-400">{info.row.original.applicant}</p></div> }),
  helper.accessor("sector", { header: "Sector" }),
  helper.accessor("region", { header: "Region" }),
  helper.accessor("requested", { header: "Requested", cell: info => `N$${info.getValue().toLocaleString("en-NA")}` }),
  helper.accessor("submitted", { header: "Submitted", cell: info => new Intl.DateTimeFormat("en-NA", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(info.getValue())) }),
  helper.accessor("status", { header: "Status", cell: info => <StatusBadge status={info.getValue()} /> }),
  helper.display({ id: "action", header: "", cell: info => <Link href={`/admin/applications/${info.row.original.id}`} className="grid size-8 place-items-center rounded-full border border-slate-200 text-slate-400 hover:border-orange hover:text-navy" aria-label={`View ${info.row.original.id}`}><ChevronRight className="size-4"/></Link> }),
]);

export function ApplicationsTable() {
  const [search, setSearch] = useState("");
  const data = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return adminApplications;
    return adminApplications.filter(item => [item.id, item.applicant, item.business, item.sector, item.region, item.status].some(value => value.toLowerCase().includes(query)));
  }, [search]);
  const table = useTable({ features, columns, data });

  return <section id="applications" className="rounded-xl border border-slate-200 bg-white shadow-sm">
    <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center"><div><h2 className="font-bold text-navy">Recent applications</h2><p className="mt-1 text-xs text-slate-400">Select a record to view the submitted information.</p></div><div className="relative w-full sm:w-72"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"/><Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search applications" className="h-10 pl-9" aria-label="Search applications"/></div></div>
    <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">{table.getHeaderGroups().map(group => <tr key={group.id}>{group.headers.map(header => <th key={header.id} className="px-5 py-3 font-bold"><button type="button" onClick={header.column.getToggleSortingHandler()} className="inline-flex items-center gap-1.5 text-left" disabled={!header.column.getCanSort()}>{header.isPlaceholder ? null : <table.FlexRender header={header}/>} {header.column.getCanSort() && <ArrowDownUp className="size-3"/>}</button></th>)}</tr>)}</thead><tbody className="divide-y divide-slate-100">{table.getRowModel().rows.map(row => <tr key={row.id} className="transition hover:bg-orange-pale/40">{row.getAllCells().map(cell => <td key={cell.id} className="px-5 py-4 text-slate-600"><table.FlexRender cell={cell}/></td>)}</tr>)}</tbody></table></div>
    <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4 text-xs text-slate-400"><span>{data.length} applications shown</span><span>Demo records</span></div>
  </section>;
}
