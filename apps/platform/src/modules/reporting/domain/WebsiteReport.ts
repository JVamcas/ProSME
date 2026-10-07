import type { WebsiteAnalyticsMetrics } from "./WebsiteAnalyticsMetrics";

export const websiteReportFrequencies = ["BIWEEKLY", "MONTHLY"] as const;
export type WebsiteReportFrequency = (typeof websiteReportFrequencies)[number];
export type WebsiteReportSchedule = {
  id: string;
  frequency: WebsiteReportFrequency;
  timezone: string | null;
  anchorDate: string | null;
  nextPeriodStart: string | null;
  sendTime: string;
  finalizationDelayHours: number;
  nextDueAt: string | null;
  enabled: boolean;
  version: number;
  eventKey: "reporting.website.biweekly" | "reporting.website.monthly";
};

export type WebsiteReportSummary = {
  id: string;
  frequency: WebsiteReportFrequency;
  startDate: string;
  endDate: string;
  timezone: string;
  scheduleVersion: number;
  state: "PENDING" | "GENERATED";
  generatedAt: string | null;
  occurrenceId: string | null;
  deliveryState: string | null;
  attemptCount: number;
  note: string | null;
};

export type WebsiteReportSnapshot = {
  propertyId: string;
  scope: "website-wide";
  metrics: WebsiteAnalyticsMetrics;
  summary: string;
  sourceNotes: string;
};

export type WebsiteReportDetail = WebsiteReportSummary & {
  snapshot: WebsiteReportSnapshot | null;
};
