"use client";

import { useMemo } from "react";
import { EChart } from "@/shared/ui/EChart";
import type { EChartsOption } from "@/shared/ui/EChartRuntime";
import type { AdminDashboardStatus } from "../AdminDashboardTypes";
import { colors } from "./AdminDashboardCharts";

export function DashboardStatusChart({
  statuses,
}: {
  statuses: AdminDashboardStatus[];
}) {
  const option = useMemo<EChartsOption>(() => ({
    animation: false,
    aria: { enabled: true },
    color: colors,
    tooltip: { trigger: "item" },
    series: [
      {
        type: "pie",
        radius: [62, 91],
        padAngle: 2,
        label: { show: false },
        data: statuses.map((status) => ({
          name: status.label,
          value: status.count,
        })),
      },
    ],
  }), [statuses]);
  return <EChart option={option} height={224} label="Applications by status" />;
}
