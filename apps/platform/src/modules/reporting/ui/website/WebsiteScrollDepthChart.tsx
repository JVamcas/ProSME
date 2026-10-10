"use client";

import { useMemo } from "react";
import { EChart } from "@/shared/ui/EChart";
import { DataTable, type DataTableColumn } from "@/shared/ui/DataTable";
import type { WebsiteHeatmapReport } from "../../domain/WebsiteHeatmap";

type ScrollDepth = WebsiteHeatmapReport["scroll"][number];

const columns: DataTableColumn<ScrollDepth>[] = [
  {
    accessorKey: "depth",
    header: "Page depth",
    cell: ({ row }) => `${row.original.depth}%`,
  },
  {
    accessorKey: "views",
    header: "Views reaching depth",
    cell: ({ row }) => row.original.views.toLocaleString(),
  },
  {
    accessorKey: "share",
    header: "Share",
    cell: ({ row }) => `${(row.original.share * 100).toFixed(1)}%`,
  },
];

export function WebsiteScrollDepthChart({
  data,
}: {
  data: WebsiteHeatmapReport["scroll"];
}) {
  const option = useMemo(
    () => ({
      animation: false,
      grid: { left: 55, right: 20, top: 20, bottom: 55 },
      xAxis: {
        type: "category" as const,
        data: data.map((row) => `${row.depth}%`),
        name: "Page depth reached",
        nameLocation: "middle" as const,
        nameGap: 35,
      },
      yAxis: {
        type: "value" as const,
        min: 0,
        max: 100,
        axisLabel: { formatter: "{value}%" },
      },
      tooltip: {
        trigger: "axis" as const,
        valueFormatter: (value: unknown) =>
          `${Number(value).toFixed(1)}% of recorded views`,
      },
      series: [
        {
          type: "line" as const,
          data: data.map((row) => Math.round(row.share * 1000) / 10),
          itemStyle: { color: "#0a183b" },
          areaStyle: { color: "#6baed6", opacity: 0.25 },
          label: { show: true, formatter: "{c}%" },
        },
      ],
    }),
    [data],
  );
  return (
    <div>
      <EChart
        option={option}
        height={320}
        label="Percentage of recorded page-layout views reaching each scroll depth"
      />
      <div
        className="mt-3"
        role="region"
        aria-label="Recorded views by scroll-depth milestone"
      >
        <DataTable
          columns={columns}
          data={data}
          density="compact"
          rowKey={(row) => String(row.depth)}
        />
      </div>
    </div>
  );
}
