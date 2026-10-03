"use client";

import { useRouter } from "next/navigation";

import { Select } from "@/shared/ui/FormPrimitives";
import type { AdminDashboardPeriod } from "@/modules/dashboard/AdminDashboardTypes";

const periods: Array<{ label: string; value: AdminDashboardPeriod }> = [
  { label: "Last 7 days", value: "7" },
  { label: "Last 30 days", value: "30" },
  { label: "Last 90 days", value: "90" },
  { label: "All time", value: "all" },
];

export function DashboardPeriodFilter({
  period,
}: {
  period: AdminDashboardPeriod;
}) {
  const router = useRouter();
  return (
    <label className="text-xs font-semibold text-brand-navy" htmlFor="period">
      Reporting period
      <Select
        className="mt-1 h-11 min-w-40"
        id="period"
        onChange={(event) => {
          router.replace(`/admin?period=${event.currentTarget.value}`);
        }}
        value={period}
      >
        {periods.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </label>
  );
}
