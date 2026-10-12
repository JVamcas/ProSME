"use client";

import { useRouter } from "next/navigation";

import { FormSelect } from "@/components/ui/form-fields";
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
    <FormSelect
      className="h-11 min-w-40"
      id="period"
      items={periods}
      label="Reporting period"
      labelClassName="text-xs font-semibold text-brand-navy"
      onChange={(event) => {
        router.replace(`/admin?period=${event.currentTarget.value}`);
      }}
      value={period}
    />
  );
}
