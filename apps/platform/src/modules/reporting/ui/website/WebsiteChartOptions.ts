import type { EChartsOption } from "@/shared/ui/EChartRuntime";
import type { WebsiteTrafficDay } from "../../domain/WebsiteAnalyticsPanels";

// ECharts requires concrete values from shared/ui/brand-tokens.css.
export const websiteChartColors = {
  blue: "#6baed6",
  navy: "#0a183b",
  cream: "#f6f4e2",
  gold: "#c9a24d",
  orange: "#ff6f00",
  green: "#16a34a",
};

export function websiteTrafficOption(
  data: WebsiteTrafficDay[],
  startDate: string,
  endDate: string,
): EChartsOption {
  const dates = data.length
    ? data.map((day) => day.date)
    : [...new Set([startDate, endDate])];
  return {
    animation: false,
    aria: { enabled: true },
    color: [websiteChartColors.blue, websiteChartColors.gold],
    grid: { left: 48, right: 22, top: 55, bottom: 64 },
    legend: {
      top: 8,
      left: "center",
      icon: "roundRect",
      data: ["Page views", "Sessions"],
    },
    toolbox: {
      right: 4,
      top: 6,
      feature: { restore: {}, saveAsImage: { name: "website-traffic" } },
    },
    media: [
      {
        query: { maxWidth: 380 },
        option: {
          grid: { left: 36, right: 12, top: 70, bottom: 64 },
          toolbox: { top: 32 },
          legend: { textStyle: { fontSize: 10 } },
        },
      },
      {
        option: {
          grid: { left: 48, right: 22, top: 55, bottom: 64 },
          toolbox: { top: 6 },
          legend: { textStyle: { fontSize: 12 } },
        },
      },
    ],
    tooltip: {
      show: data.length > 0,
      trigger: "axis",
      axisPointer: { type: "cross" },
    },
    dataZoom: [
      { type: "inside", disabled: data.length < 2 },
      {
        type: "slider",
        show: data.length > 1,
        bottom: 8,
        height: 20,
        borderColor: "#e2e8f0",
      },
    ],
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: dates,
      axisLine: { lineStyle: { color: "#cbd5e1" } },
      axisTick: { show: false },
      axisLabel: {
        color: "#64748b",
        fontSize: 11,
        formatter: (date: string) => date.slice(5),
      },
    },
    yAxis: {
      type: "value",
      min: 0,
      max: data.length ? undefined : 1,
      minInterval: 1,
      axisLabel: { color: "#64748b", fontSize: 11 },
      splitLine: { lineStyle: { color: "#e2e8f0", type: "dashed" } },
    },
    series: [
      {
        name: "Page views",
        type: "line",
        showSymbol: false,
        symbol: "circle",
        symbolSize: 7,
        lineStyle: { width: 3 },
        areaStyle: { opacity: 0.16 },
        connectNulls: false,
        data: data.length
          ? data.map((day) => day.pageViews)
          : dates.map(() => null),
      },
      {
        name: "Sessions",
        type: "line",
        showSymbol: false,
        symbol: "circle",
        symbolSize: 7,
        lineStyle: { width: 2 },
        areaStyle: { opacity: 0.06 },
        connectNulls: false,
        data: data.length
          ? data.map((day) => day.sessions)
          : dates.map(() => null),
      },
    ],
  };
}
