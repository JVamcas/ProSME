import type { WebsiteAnalyticsQuery } from "../api/WebsiteAnalyticsSchemas";
import type { SelfCheckOutcome } from "./WebsiteAnalyticsCollection";
import type { WebsiteUserJourney } from "./WebsiteUserJourneys";
import type {
  WebsiteAnalyticsSynchronization,
  WebsiteMetricChanges,
} from "./WebsiteAnalyticsSnapshots";
import type {
  BoundedWebsiteRows,
  WebsiteCallEngagement,
  WebsiteGeography,
  WebsiteSelfCheckJourney,
  WebsiteTrafficDay,
  WebsiteViewedPage,
} from "./WebsiteAnalyticsPanels";

export type AnalyticsSourceMetadata = {
  timezone: string | null;
  subjectToThresholding: boolean;
  dataLossFromOtherRow: boolean;
  sampled: boolean;
  sampling: { samplesReadCount: string; samplingSpaceSize: string }[];
};

export type AnalyticsSourceResult<T> = {
  state: "ready" | "no-data" | "unavailable" | "failure" | "stale";
  data: T | null;
  fetchedAt: string | null;
  metadata: AnalyticsSourceMetadata | null;
  note: string | null;
};

export type WebsiteTrafficTotals = {
  visitors: number;
  pageViews: number;
  averageSessionDurationSeconds: number;
};
export type WebsiteApplicationReach = {
  startedUsers: number;
  submittedUsers: number;
};
export type WebsiteOrderedFunnel = {
  viewedUsers: number;
  completedSelfCheckUsers: number;
  startedUsers: number;
  submittedUsers: number;
};
export type WebsiteStarterCompletion = {
  startedUsers: number;
  submittedUsers: number;
  rate: number | null;
};

export function starterCompletion(
  startedUsers: number,
  submittedUsers: number,
): WebsiteStarterCompletion {
  if (
    ![startedUsers, submittedUsers].every(
      (value) => Number.isSafeInteger(value) && value >= 0,
    ) ||
    submittedUsers > startedUsers
  ) {
    throw new Error("Invalid ordered funnel counts.");
  }
  return {
    startedUsers,
    submittedUsers,
    rate: startedUsers ? submittedUsers / startedUsers : null,
  };
}

export type WebsiteAnalyticsMetrics = {
  contractVersion: "d1-v2";
  period: WebsiteAnalyticsQuery;
  comparison: {
    period: WebsiteAnalyticsQuery;
    traffic: AnalyticsSourceResult<WebsiteTrafficTotals>;
    applicationReach: AnalyticsSourceResult<WebsiteApplicationReach>;
    starterCompletion: AnalyticsSourceResult<WebsiteStarterCompletion>;
    changes: WebsiteMetricChanges;
  } | null;
  synchronization: WebsiteAnalyticsSynchronization | null;
  collectionStart: string | null;
  gaBrowserCollectionEnabled: boolean;
  coverage: string;
  heatmap: {
    provider: "Platform";
    state: "ready" | "unavailable";
    collectionEnabled: boolean;
    note: string;
  };
  scopes: {
    traffic: "website-wide";
    dailyTraffic: "website-wide";
    mostViewedPages: "website-wide";
    topUserJourneys: "public-website";
    geography: "Namibia";
    fundingCallEngagement: "website-wide" | "funding-call";
    selfCheckJourney: "website-wide" | "funding-call";
    applications: "website-wide" | "funding-call";
    eligibility: "website-wide" | "funding-call";
  };
  traffic: AnalyticsSourceResult<WebsiteTrafficTotals>;
  dailyTraffic: AnalyticsSourceResult<WebsiteTrafficDay[]>;
  mostViewedPages: AnalyticsSourceResult<BoundedWebsiteRows<WebsiteViewedPage>>;
  topUserJourneys: AnalyticsSourceResult<
    BoundedWebsiteRows<WebsiteUserJourney>
  >;
  geography: AnalyticsSourceResult<WebsiteGeography>;
  fundingCallEngagement: AnalyticsSourceResult<
    BoundedWebsiteRows<WebsiteCallEngagement>
  >;
  selfCheckJourney: AnalyticsSourceResult<WebsiteSelfCheckJourney>;
  applicationReach: AnalyticsSourceResult<WebsiteApplicationReach>;
  applicationFunnel: AnalyticsSourceResult<WebsiteOrderedFunnel>;
  starterCompletion: AnalyticsSourceResult<WebsiteStarterCompletion>;
  eligibility: AnalyticsSourceResult<
    { outcome: SelfCheckOutcome; checks: number }[]
  >;
};
