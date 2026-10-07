"use client";

import { useMemo } from "react";
import type { CustomSeriesRenderItem } from "echarts";
import { EChart } from "@/shared/ui/EChart";
import type {
  HeatmapVariant,
  WebsiteHeatmapReport,
} from "../../domain/WebsiteHeatmap";

export function WebsiteClickHeatmap({
  layout,
  clicks,
}: {
  layout: HeatmapVariant;
  clicks: WebsiteHeatmapReport["clicks"];
}) {
  const option = useMemo(() => {
    const renderBox: CustomSeriesRenderItem = (_params, api) => {
      const x = Number(api.value(0));
      const y = Number(api.value(1));
      const top = api.coord([x, y]);
      const bottom = api.coord([
        x + Number(api.value(2)),
        y + Number(api.value(3)),
      ]);
      return {
        type: "rect",
        shape: {
          x: top[0],
          y: top[1],
          width: bottom[0] - top[0],
          height: bottom[1] - top[1],
        },
        style: {
          fill: "rgba(107,174,214,0.06)",
          stroke: "rgba(10,24,59,0.15)",
          lineWidth: 1,
        },
        silent: true,
      };
    };
    return {
      animation: false,
      grid: { top: 15, bottom: 70, left: 10, right: 40 },
      xAxis: { type: "value" as const, min: 0, max: 100, show: false },
      yAxis: {
        type: "value" as const,
        min: 0,
        max: 100,
        inverse: true,
        axisLabel: { formatter: "{value}%" },
      },
      tooltip: {
        trigger: "item" as const,
        formatter: (params: unknown) => {
          const value = (params as { value: number[] }).value;
          return `${value[2]} clicks · ${value[1].toFixed(0)}% down the page`;
        },
      },
      visualMap: {
        type: "continuous" as const,
        seriesIndex: 1,
        dimension: 2,
        min: 0,
        max: Math.max(1, ...clicks.map((click) => click.count)),
        bottom: 0,
        orient: "horizontal" as const,
        left: "center",
        inRange: { color: ["#f6f4e2", "#ffca45", "#ff6f00", "#0a183b"] },
      },
      dataZoom: [{ type: "inside" as const, yAxisIndex: 0 }],
      series: [
        {
          type: "custom" as const,
          renderItem: renderBox,
          silent: true,
          data: layout.boxes.map((box) => [
            box.x / 100,
            box.y / 100,
            box.width / 100,
            box.height / 100,
          ]),
        },
        {
          type: "scatter" as const,
          symbolSize: (value: number[]) =>
            Math.min(36, 8 + Math.sqrt(value[2]) * 4),
          itemStyle: { opacity: 0.8 },
          data: clicks.map((click) => [
            click.x + 1,
            click.y + 1,
            click.count,
          ]),
        },
      ],
    };
  }, [layout, clicks]);
  return (
    <div>
      <EChart
        option={option}
        height={400}
        label="Click hotspots over the captured masked public-page layout"
      />
      <p className="mt-2 text-xs text-slate-500">
        Masked layout: outlines show page regions and links. Larger, darker
        hotspots indicate more clicks.
      </p>
      {!clicks.length ? (
        <p role="status" className="mt-2 text-sm">
          No clicks recorded for this layout.
        </p>
      ) : null}
    </div>
  );
}
