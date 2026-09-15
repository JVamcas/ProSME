"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import type { AdminDashboardStatus } from "@/modules/dashboard/AdminDashboardTypes";

const colors = [
  "#0066cc",
  "#3b82f6",
  "#c9a24d",
  "#16a34a",
  "#ff6f00",
  "#6b7280",
];

export function AdminDashboardCharts({
  statuses,
  total,
}: {
  statuses: AdminDashboardStatus[];
  total: number;
}) {
  return (
    <section className="rounded-2xl border border-brand-navy/10 bg-brand-white p-5 shadow-sm">
      <h2 className="text-2xl font-bold text-brand-navy">
        Applications by status
      </h2>
      {statuses.length ? (
        <div className="mt-5 grid items-center gap-6 sm:grid-cols-[minmax(190px,.8fr)_1fr]">
          <div className="relative h-56">
            <ResponsiveContainer height="100%" width="100%">
              <PieChart>
                <Pie
                  data={statuses}
                  dataKey="count"
                  innerRadius={62}
                  nameKey="label"
                  outerRadius={91}
                  paddingAngle={2}
                >
                  {statuses.map((status, index) => (
                    <Cell
                      fill={colors[index % colors.length]}
                      key={status.label}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
              <strong className="text-2xl text-brand-navy">{total}</strong>
              <span className="text-xs text-brand-navy/55">Total</span>
            </div>
          </div>
          <ul className="grid gap-3">
            {statuses.map((status, index) => (
              <li className="flex items-start gap-3 text-sm" key={status.label}>
                <span
                  aria-hidden="true"
                  className="mt-1 size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                <span className="flex-1 text-brand-navy/70">{status.label}</span>
                <strong className="text-brand-navy">{status.count}</strong>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-8 rounded-xl bg-brand-navy/5 px-5 py-8 text-center text-sm text-brand-navy/65">
          No submitted applications exist for this period and access scope.
        </p>
      )}
    </section>
  );
}
