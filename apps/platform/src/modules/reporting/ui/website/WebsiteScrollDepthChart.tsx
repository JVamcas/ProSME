"use client";

import { useMemo } from "react";
import { EChart } from "@/shared/ui/EChart";
import type { WebsiteHeatmapReport } from "../../domain/WebsiteHeatmap";

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
        label="Percentage of consenting page-layout views reaching each scroll depth"
      />
      <table className="mt-3 w-full text-sm">
        <caption className="sr-only">
          Recorded views by scroll-depth milestone
        </caption>
        <thead>
          <tr>
            <th scope="col">Page depth</th>
            <th scope="col">Views reaching depth</th>
            <th scope="col">Share</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.depth} className="border-t border-brand-blue/20">
              <td className="py-1 text-center">{row.depth}%</td>
              <td className="text-center">{row.views.toLocaleString()}</td>
              <td className="text-center">{(row.share * 100).toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
