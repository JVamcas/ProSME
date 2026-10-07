import type {
  AnalyticsSourceResult,
  WebsiteAnalyticsMetrics,
} from "./WebsiteAnalyticsMetrics";

export const websiteAnalyticsContractVersion = "d1-v2" as const;

export const websiteMetricSources = [
  "traffic",
  "applicationReach",
  "starterCompletion",
] as const;

export const websitePanelSources = [
  "applicationFunnel",
  "dailyTraffic",
  "mostViewedPages",
  "geography",
  "fundingCallEngagement",
  "selfCheckJourney",
  "topUserJourneys",
] as const;

export type WebsiteSourceName =
  (typeof websiteMetricSources)[number] | (typeof websitePanelSources)[number];

export type WebsiteSourceSnapshots = Pick<
  WebsiteAnalyticsMetrics,
  WebsiteSourceName
>;
export type WebsiteSourceBatch = Partial<
  Record<WebsiteSourceName, AnalyticsSourceResult<unknown>>
>;
export type WebsiteMetricChanges = {
  visitors: number | null;
  pageViews: number | null;
  duration: number | null;
  starts: number | null;
  submissions: number | null;
  conversion: number | null;
};

export type WebsiteAnalyticsSynchronization = {
  state: "pending" | "refreshing" | "ready" | "partial" | "failed";
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
};
