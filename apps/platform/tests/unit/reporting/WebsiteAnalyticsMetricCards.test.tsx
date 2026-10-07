import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { WebsiteAnalyticsMetrics } from "@/modules/reporting/domain/WebsiteAnalyticsMetrics";
import { WebsiteAnalyticsMetrics as MetricCards } from "@/modules/reporting/ui/website/WebsiteAnalyticsMetrics";

function metrics() {
  return {
    traffic: {
      state: "ready",
      data: {
        visitors: 12480,
        pageViews: 46320,
        averageSessionDurationSeconds: 204,
      },
    },
    applicationReach: {
      state: "ready",
      data: { startedUsers: 2186, submittedUsers: 1024 },
    },
    starterCompletion: { state: "ready", data: { rate: 0.468 } },
    comparison: {
      period: { startDate: "2026-09-01", endDate: "2026-09-30" },
      changes: {
        visitors: 0.18,
        pageViews: 0.25,
        duration: 0.12,
        starts: 0.34,
        submissions: 0.28,
        conversion: 0.09,
      },
    },
  } as WebsiteAnalyticsMetrics;
}

describe("reference KPI presentation", () => {
  it("renders six compact cards with labels above values, upper-right icons and actual SQL comparison values", () => {
    const markup = renderToStaticMarkup(<MetricCards data={metrics()} />);
    expect(markup.match(/<article/g)).toHaveLength(6);
    expect(markup.indexOf("Unique Visitors")).toBeLessThan(
      markup.indexOf("12,480"),
    );
    for (const text of [
      "46,320",
      "3m 24s",
      "2,186",
      "1,024",
      "46.8%",
      "18%",
      "25%",
      "34%",
      "vs previous period",
    ]) {
      expect(markup).toContain(text);
    }
    expect(markup).toContain("bg-blue-50");
    expect(markup).toContain("bg-violet-50");
    expect(markup).not.toContain("-bottom-16");
  });

  it("shows missing measurements and comparisons honestly", () => {
    const data = metrics();
    data.traffic = {
      state: "failure",
      data: null,
      metadata: null,
      fetchedAt: null,
      note: null,
    };
    data.comparison = null;
    const markup = renderToStaticMarkup(<MetricCards data={data} />);
    expect(markup).toContain("Data could not be loaded.");
    expect(markup).toContain("Comparison unavailable");
    expect(markup).not.toContain("18%");
    expect(markup).not.toContain("12,480");
  });

  it("keeps stored stale values visible and formats decreases and zero change", () => {
    const data = metrics();
    data.traffic.state = "stale";
    data.comparison!.changes.visitors = null;
    data.comparison!.changes.starts = -0.1;
    data.comparison!.changes.submissions = 0;
    const markup = renderToStaticMarkup(<MetricCards data={data} />);
    expect(markup).toContain("12,480");
    expect(markup).toContain("Showing the last available data.");
    expect(markup).toContain("text-red-600");
    expect(markup).toContain("10%");
    expect(markup).toContain("0%");
  });
});
