"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { AdminDashboardStatus } from "../AdminDashboardTypes";
import { colors } from "./AdminDashboardCharts";

export function DashboardStatusChart({
  statuses,
}: {
  statuses: AdminDashboardStatus[];
}) {
  return (
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
            <Cell fill={colors[index % colors.length]} key={status.label} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}
