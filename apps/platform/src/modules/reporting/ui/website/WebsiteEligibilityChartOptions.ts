import type { EChartsOption } from "@/shared/ui/EChartRuntime";
import type { SelfCheckOutcome } from "../../domain/WebsiteAnalyticsCollection";
import { websiteChartColors } from "./WebsiteChartOptions";
import { analyticsCount } from "./WebsiteAnalyticsFormatting";

export const eligibilityChartLabels: Record<SelfCheckOutcome, string> = {
  "likely-eligible": "Likely eligible",
  "not-currently-eligible": "Not currently eligible",
  "review-required": "Review required",
};

export function eligibilityChartOption(
  data: { outcome: SelfCheckOutcome; checks: number }[],
): EChartsOption {
  const hasChecks = data.some((row) => row.checks > 0);
  const counts = new Map(
    data.map((row) => [eligibilityChartLabels[row.outcome], row.checks]),
  );
  const colors = {
    "likely-eligible": websiteChartColors.green,
    "not-currently-eligible": websiteChartColors.navy,
    "review-required": websiteChartColors.gold,
  };
  return {
    animation: false,
    aria: { enabled: true },
    tooltip: { show: hasChecks, trigger: "item" },
    legend: {
      bottom: 0,
      orient: "vertical",
      icon: "circle",
      data: hasChecks
        ? data.map((row) => eligibilityChartLabels[row.outcome])
        : [],
      formatter: (name) => `${name}  ${analyticsCount(counts.get(name) ?? 0)}`,
    },
    graphic: hasChecks
      ? []
      : [
          {
            type: "text",
            left: "center",
            top: "38%",
            style: {
              text: "No checks",
              fill: websiteChartColors.navy,
              fontSize: 12,
            },
          },
        ],
    series: [
      {
        type: "pie",
        radius: ["42%", "65%"],
        center: ["50%", "38%"],
        padAngle: hasChecks ? 3 : 0,
        label: {
          show: hasChecks,
          position: "inside",
          formatter: "{d}%",
          color: "#0a183b",
        },
        itemStyle: { borderRadius: 6, borderColor: "#ffffff", borderWidth: 2 },
        emphasis: {
          scaleSize: 6,
          itemStyle: { shadowBlur: 10, shadowColor: "#0a183b20" },
        },
        silent: !hasChecks,
        data: hasChecks
          ? data.map((row) => ({
              name: eligibilityChartLabels[row.outcome],
              value: row.checks,
              itemStyle: { color: colors[row.outcome] },
              label: {
                color:
                  row.outcome === "not-currently-eligible"
                    ? "#ffffff"
                    : websiteChartColors.navy,
              },
            }))
          : [
              {
                name: "No recorded checks",
                value: 1,
                itemStyle: { color: websiteChartColors.cream },
              },
            ],
      },
    ],
  };
}
