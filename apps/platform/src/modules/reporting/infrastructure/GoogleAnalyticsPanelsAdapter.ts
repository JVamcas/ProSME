import "server-only";

import { z } from "zod";
import type { WebsiteAnalyticsQuery } from "../api/WebsiteAnalyticsSchemas";
import { canonicalNamibiaRegion } from "../domain/NamibiaVisitorRegions";
import type {
  BoundedWebsiteRows,
  WebsiteGeography,
  WebsiteTrafficDay,
  WebsiteViewedPage,
} from "../domain/WebsiteAnalyticsPanels";
import {
  isAnalyticsFundingCallId,
  websiteAnalyticsPage,
} from "../domain/WebsiteAnalyticsCollection";
import type { GoogleAnalyticsConfiguration } from "./GoogleAnalyticsConfiguration";
import {
  dailyTrafficQuery,
  fundingCallEngagementQuery,
  mostViewedPagesQuery,
  visitorRegionsQuery,
} from "./GoogleAnalyticsPanelQueries";
import { predefinedJourneyQuery } from "./GoogleAnalyticsQueries";
import {
  analyticsReportSchema,
  countMetric,
  funnelCounts,
  normalizedAnalyticsResult,
  stringDimension,
  type AnalyticsReport,
} from "./GoogleAnalyticsResponse";
import { requestGoogleAnalytics } from "./GoogleAnalyticsTransport";

function bounded<T>(report: AnalyticsReport, rows: T[]): BoundedWebsiteRows<T> {
  const totalRows = report.rowCount ?? rows.length;
  return { rows, totalRows, truncated: totalRows > rows.length };
}

function approvedCallDimension(
  report: AnalyticsReport,
  row: NonNullable<AnalyticsReport["rows"]>[number],
) {
  const value = stringDimension(report, row, "customEvent:funding_call_id");
  return isAnalyticsFundingCallId(value) ? value : "(not set)";
}

export class GoogleAnalyticsPanelsAdapter {
  constructor(
    private readonly configuration: GoogleAnalyticsConfiguration,
    private readonly request = requestGoogleAnalytics,
  ) {}

  private async read(body: object) {
    return analyticsReportSchema.parse(
      await this.request(this.configuration.propertyId, "runReport", body),
    );
  }

  async dailyTraffic(input: WebsiteAnalyticsQuery) {
    const report = await this.read(dailyTrafficQuery(input));
    const data: WebsiteTrafficDay[] = (report.rows ?? []).map((row) => {
      const date = stringDimension(report, row, "date");
      if (!/^\d{8}$/.test(date)) throw new Error("Invalid traffic date.");
      return {
        date: `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`,
        pageViews: countMetric(report, row, "screenPageViews"),
        sessions: countMetric(report, row, "sessions"),
      };
    });
    return normalizedAnalyticsResult(report, data);
  }

  async pages(input: WebsiteAnalyticsQuery) {
    const report = await this.read(mostViewedPagesQuery(input));
    const rows: WebsiteViewedPage[] = (report.rows ?? []).map((row) => {
      const raw = stringDimension(report, row, "pagePath");
      // Old/provider data also crosses the response privacy boundary.
      const path = websiteAnalyticsPage(raw)?.path ?? "Unmapped page";
      return { path, pageViews: countMetric(report, row, "screenPageViews") };
    });
    return normalizedAnalyticsResult(report, bounded(report, rows));
  }

  async regions(input: WebsiteAnalyticsQuery) {
    const report = await this.read(visitorRegionsQuery(input));
    if ((report.rowCount ?? 0) > 100)
      throw new Error("Region coverage exceeds the bounded projection.");
    const regions = (report.rows ?? []).map((row) => {
      const providerRegion = stringDimension(report, row, "region");
      return {
        providerRegion,
        canonicalRegion: canonicalNamibiaRegion(providerRegion),
        users: countMetric(report, row, "totalUsers"),
      };
    });
    const regionalUserSum = regions.reduce(
      (total, region) => total + region.users,
      0,
    );
    const data: WebsiteGeography = {
      country: "Namibia",
      regionalUserSum,
      shareDenominator: "sum-of-regional-user-counts",
      regions: regions.map((region) => ({
        ...region,
        share: regionalUserSum ? region.users / regionalUserSum : 0,
      })),
    };
    return {
      ...normalizedAnalyticsResult(report, data),
      note: "",
    };
  }

  async calls(input: WebsiteAnalyticsQuery) {
    const report = await this.read(fundingCallEngagementQuery(input));
    const rows = (report.rows ?? []).map((row) => ({
      fundingCallId: approvedCallDimension(report, row),
      event: stringDimension(report, row, "eventName"),
      users: countMetric(report, row, "totalUsers"),
      events: countMetric(report, row, "eventCount"),
    }));
    return {
      ...normalizedAnalyticsResult(report, bounded(report, rows)),
      note: "Top 100 call/event rows. Views and applications count recorded funding-call-view and application-submit events from consenting users. Older reports without event counts show unavailable values until refreshed.",
    };
  }

  async selfCheckJourney(input: WebsiteAnalyticsQuery) {
    const events = ["funding_call_view", "eligibility_check_complete"];
    const response = z
      .object({ funnelVisualization: analyticsReportSchema })
      .parse(
        await this.request(
          this.configuration.propertyId,
          "runFunnelReport",
          predefinedJourneyQuery(input, events),
        ),
      );
    const report = response.funnelVisualization;
    const [viewedUsers, completedSelfCheckUsers] = funnelCounts(report, events);
    if (completedSelfCheckUsers > viewedUsers)
      throw new Error("Invalid self-check journey.");
    return normalizedAnalyticsResult(report, {
      viewedUsers,
      completedSelfCheckUsers,
    });
  }
}
