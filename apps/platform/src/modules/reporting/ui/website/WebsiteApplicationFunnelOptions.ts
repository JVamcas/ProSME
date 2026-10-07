import type { EChartsOption } from "@/shared/ui/EChartRuntime";
import type { WebsiteOrderedFunnel } from "../../domain/WebsiteAnalyticsMetrics";
import { analyticsCount } from "./WebsiteAnalyticsFormatting";
import { websiteChartColors } from "./WebsiteChartOptions";

export function applicationFunnelSteps(data: WebsiteOrderedFunnel) {
  return [
    { name: "Funding Call View", users: data.viewedUsers },
    {
      name: "Eligibility Check Completed",
      users: data.completedSelfCheckUsers,
    },
    { name: "Application Started", users: data.startedUsers },
    { name: "Application Submitted", users: data.submittedUsers },
  ];
}

export function applicationFunnelOption(
  data: WebsiteOrderedFunnel,
): EChartsOption {
  const steps = applicationFunnelSteps(data);
  const hasUsers = steps.some((step) => step.users > 0);
  return {
    animation: false,
    aria: {
      enabled: true,
      label: {
        description: steps
          .map((step) => `${step.name}: ${step.users} users`)
          .join(". "),
      },
    },
    color: [
      websiteChartColors.blue,
      websiteChartColors.gold,
      websiteChartColors.orange,
      websiteChartColors.green,
    ],
    tooltip: {
      show: hasUsers,
      trigger: "item",
      valueFormatter: (value) => `${analyticsCount(Number(value))} users`,
    },
    series: [
      {
        type: "funnel",
        sort: "none",
        top: 20,
        bottom: 20,
        left: "4%",
        right: "42%",
        minSize: hasUsers ? "0%" : "15%",
        maxSize: "100%",
        gap: 6,
        silent: !hasUsers,
        label: {
          show: true,
          position: "right",
          width: 155,
          overflow: "break",
          formatter: (params) => {
            const step = params.data as { users: number };
            return `{stage|${params.name}}\n{count|${analyticsCount(step.users)}}`;
          },
          rich: {
            stage: {
              color: "#475569",
              fontSize: 12,
              lineHeight: 18,
            },
            count: {
              color: websiteChartColors.navy,
              fontSize: 18,
              fontWeight: "bold",
              lineHeight: 26,
            },
          },
        },
        labelLine: {
          show: true,
          length: 18,
          lineStyle: { width: 1, color: "#94a3b8" },
        },
        itemStyle: {
          borderColor: "#ffffff",
          borderWidth: 2,
          opacity: hasUsers ? 1 : 0.6,
        },
        emphasis: {
          itemStyle: { opacity: 1, shadowBlur: 12, shadowColor: "#0a183b20" },
        },
        data: steps.map((step, index) => ({
          ...step,
          // Empty segments show the stage structure; native labels retain real zeros.
          value: hasUsers ? step.users : steps.length - index,
        })),
      },
    ],
  };
}
