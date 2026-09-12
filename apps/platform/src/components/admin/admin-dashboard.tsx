"use client";

import { Bell } from "lucide-react";

import { Select } from "@/components/ui/form-controls";
import { AdminDashboardCharts } from "./admin-dashboard-charts";
import { AdminDashboardPanels } from "./admin-dashboard-panels";

export function AdminDashboard() {
  return (
    <div className="mx-auto max-w-[1240px] p-4 sm:p-7 lg:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-bold text-navy">Admin Dashboard</h1>
          <p className="mt-1 text-xs text-slate-400">
            Overview of platform activities
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Bell className="size-5 text-slate-500" />
          <Select
            aria-label="Dashboard date range"
            className="h-10 rounded-md border-slate-200 px-3 text-xs text-slate-600"
          >
            <option>01 May 2024 - 31 May 2024</option>
          </Select>
        </div>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["128", "Total Applications"],
          ["45", "In Review"],
          ["32", "Approved"],
          ["12", "Rejected"],
        ].map(([value, label]) => (
          <article
            key={label}
            className="rounded-lg border border-slate-200 bg-white px-5 py-6 text-center shadow-sm"
          >
            <p className="text-3xl font-bold text-navy">{value}</p>
            <p className="mt-2 text-xs text-slate-500">{label}</p>
          </article>
        ))}
      </div>

      <AdminDashboardCharts />
      <AdminDashboardPanels />
    </div>
  );
}
