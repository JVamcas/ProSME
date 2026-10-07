import { Clock, Eye, FilePlus2, Send, Timer, Users } from "lucide-react";
import { DashboardMetricCard } from "@/shared/ui/DashboardMetricCard";
import type { WebsiteAnalyticsMetrics as Metrics } from "../../domain/WebsiteAnalyticsMetrics";
import {
  analyticsCount,
  analyticsDuration,
  analyticsPercent,
} from "./WebsiteAnalyticsFormatting";

const sourceLabels = {
  ready: "",
  "no-data": "No recorded data for this period.",
  unavailable: "Data unavailable.",
  failure: "Data could not be loaded.",
  stale: "Showing the last available data.",
};

export function WebsiteAnalyticsMetrics({ data }: { data: Metrics }) {
  const traffic = data.traffic.data;
  const reach = data.applicationReach.data;
  const previous = data.comparison;
  const cards = [
    {
      icon: Eye,
      label: "Unique Visitors",
      amount: traffic?.visitors,
      change: previous?.changes.visitors,
      source: data.traffic,
      format: analyticsCount,
      description: "Unique consenting visitors across the website.",
    },
    {
      icon: Clock,
      label: "Page Views",
      amount: traffic?.pageViews,
      change: previous?.changes.pageViews,
      source: data.traffic,
      format: analyticsCount,
      description: "Recorded page views across the website.",
    },
    {
      icon: Timer,
      label: "Avg. Session Duration",
      amount: traffic?.averageSessionDurationSeconds,
      change: previous?.changes.duration,
      source: data.traffic,
      format: analyticsDuration,
      description: "Average recorded session duration across the website.",
    },
    {
      icon: FilePlus2,
      label: "Application Starts",
      amount: reach?.startedUsers,
      change: previous?.changes.starts,
      source: data.applicationReach,
      format: analyticsCount,
      description: "Tracked users starting applications in the selected scope.",
      iconTone: "violet" as const,
    },
    {
      icon: Send,
      label: "Applications Submitted",
      amount: reach?.submittedUsers,
      change: previous?.changes.submissions,
      source: data.applicationReach,
      format: analyticsCount,
      description:
        "Tracked users submitting applications in the selected scope.",
      iconTone: "violet" as const,
    },
    {
      icon: Users,
      label: "Application Conversion Rate",
      amount: data.starterCompletion.data?.rate,
      change: previous?.changes.conversion,
      source: data.starterCompletion,
      format: analyticsPercent,
      description:
        "Users submitting after starting, divided by users starting.",
    },
  ];
  return (
    <section
      aria-label="Website metrics"
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6"
    >
      {cards.map((card) => {
        const status = sourceLabels[card.source.state];
        const comparisonNote = previous
          ? `Compared with ${previous.period.startDate} to ${previous.period.endDate}.`
          : "Comparison is unavailable before collection began.";
        return (
          <DashboardMetricCard
            variant="summary"
            key={card.label}
            icon={card.icon}
            iconTone={card.iconTone ?? "blue"}
            label={card.label}
            value={card.amount == null ? "—" : card.format(card.amount)}
            change={card.change ?? null}
            supportingText="vs previous period"
            statusText={status}
            title={`${card.description} ${status} ${comparisonNote}`}
          />
        );
      })}
    </section>
  );
}
