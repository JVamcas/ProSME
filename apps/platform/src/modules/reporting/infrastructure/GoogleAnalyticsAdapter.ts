import "server-only";

import { z } from "zod";
import type { WebsiteAnalyticsQuery } from "../api/WebsiteAnalyticsSchemas";
import { starterCompletion } from "../domain/WebsiteAnalyticsMetrics";
import type { GoogleAnalyticsConfiguration } from "./GoogleAnalyticsConfiguration";
import {
  applicationReachQuery,
  orderedFunnelQuery,
  trafficTotalsQuery,
} from "./GoogleAnalyticsQueries";
import {
  analyticsReportSchema,
  countMetric,
  funnelCounts,
  numericMetric,
  normalizedAnalyticsResult as normalized,
} from "./GoogleAnalyticsResponse";
import { requestGoogleAnalytics } from "./GoogleAnalyticsTransport";

const funnelSchema = z.object({ funnelVisualization: analyticsReportSchema });
type Transport = typeof requestGoogleAnalytics;

export class GoogleAnalyticsAdapter {
  constructor(
    private readonly configuration: GoogleAnalyticsConfiguration,
    private readonly request: Transport = requestGoogleAnalytics,
  ) {}

  async traffic(input: WebsiteAnalyticsQuery) {
    const report = analyticsReportSchema.parse(
      await this.request(
        this.configuration.propertyId,
        "runReport",
        trafficTotalsQuery(input),
      ),
    );
    if (report.metadata?.timeZone !== this.configuration.timezone) {
      throw new Error(
        "Analytics property timezone does not match configuration.",
      );
    }
    const row = report.rows?.[0];
    if ((report.rows?.length ?? 0) > 1)
      throw new Error("Unexpected traffic rows.");
    return normalized(report, {
      visitors: row ? countMetric(report, row, "totalUsers") : 0,
      pageViews: row ? countMetric(report, row, "screenPageViews") : 0,
      averageSessionDurationSeconds: row
        ? numericMetric(report, row, "averageSessionDuration")
        : 0,
    });
  }

  async reach(input: WebsiteAnalyticsQuery) {
    const report = analyticsReportSchema.parse(
      await this.request(
        this.configuration.propertyId,
        "runReport",
        applicationReachQuery(input),
      ),
    );
    const eventIndex =
      report.dimensionHeaders?.findIndex(
        (header) => header.name === "eventName",
      ) ?? -1;
    if (eventIndex < 0) throw new Error("Missing analytics event dimension.");
    const counts = new Map<string, number>();
    for (const row of report.rows ?? []) {
      const event = row.dimensionValues?.[eventIndex]?.value;
      if (
        !event ||
        counts.has(event) ||
        !["application_start", "application_submit"].includes(event)
      ) {
        throw new Error("Unexpected analytics event row.");
      }
      counts.set(event, countMetric(report, row, "totalUsers"));
    }
    return normalized(report, {
      startedUsers: counts.get("application_start") ?? 0,
      submittedUsers: counts.get("application_submit") ?? 0,
    });
  }

  private async funnelReport(
    input: WebsiteAnalyticsQuery,
    includeCallView: boolean,
  ) {
    return funnelSchema.parse(
      await this.request(
        this.configuration.propertyId,
        "runFunnelReport",
        orderedFunnelQuery(input, includeCallView),
      ),
    ).funnelVisualization;
  }

  async applicationFunnel(input: WebsiteAnalyticsQuery) {
    const report = await this.funnelReport(input, true);
    const [viewedUsers, completedSelfCheckUsers, startedUsers, submittedUsers] =
      funnelCounts(report, [
        "funding_call_view",
        "eligibility_check_complete",
        "application_start",
        "application_submit",
      ]);
    if (
      completedSelfCheckUsers > viewedUsers ||
      startedUsers > completedSelfCheckUsers
    )
      throw new Error("Invalid call funnel counts.");
    starterCompletion(startedUsers, submittedUsers);
    return normalized(report, {
      viewedUsers,
      completedSelfCheckUsers,
      startedUsers,
      submittedUsers,
    });
  }

  async completion(input: WebsiteAnalyticsQuery) {
    const report = await this.funnelReport(input, false);
    const [started, submitted] = funnelCounts(report, [
      "application_start",
      "application_submit",
    ]);
    const result = normalized(report, starterCompletion(started, submitted));
    return started
      ? result
      : {
          ...result,
          state: "unavailable" as const,
          note: "Completion rate is unavailable because no tracked users started in this period.",
        };
  }
}
