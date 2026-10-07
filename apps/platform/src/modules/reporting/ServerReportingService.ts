import "server-only";
import { listReportingFundingCalls } from "./infrastructure/ReportingFundingCallRepository";
import { readStoredWebsiteAnalytics } from "./infrastructure/WebsiteAnalyticsSnapshotRepository";
import { previousWebsiteAnalyticsPeriod } from "./domain/WebsiteAnalyticsComparison";
import { websiteAnalyticsContractVersion } from "./domain/WebsiteAnalyticsSnapshots";

import { requirePermission } from "@/auth/authorization/policy";
import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";
import {
  websiteAnalyticsQuerySchema,
  type WebsiteAnalyticsQuery,
} from "./api/WebsiteAnalyticsSchemas";
import type {
  AnalyticsSourceResult,
  WebsiteAnalyticsMetrics,
} from "./domain/WebsiteAnalyticsMetrics";
import { googleAnalyticsConfiguration } from "./infrastructure/GoogleAnalyticsConfiguration";
import { getWebsiteHeatmapConfiguration } from "./ServerWebsiteAnalyticsCollectionService";

function unavailable<T>(note: string): AnalyticsSourceResult<T> {
  return {
    state: "unavailable",
    data: null,
    fetchedAt: null,
    metadata: null,
    note,
  };
}

export async function getWebsiteAnalyticsPageContext(
  user: AuthenticatedUser | null,
) {
  requirePermission(user, permissionCodes.reportingWebsiteReadAll);
  const configuration = googleAnalyticsConfiguration();
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: configuration?.timezone ?? "Africa/Windhoek",
  }).format(new Date());
  const start = new Date(`${date}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - 29);
  const calls = await listReportingFundingCalls().catch(() => []);
  return {
    calls,
    initialQuery: {
      startDate: start.toISOString().slice(0, 10),
      endDate: date,
    },
  };
}

export async function getWebsiteAnalytics(
  user: AuthenticatedUser | null,
  query: WebsiteAnalyticsQuery,
): Promise<WebsiteAnalyticsMetrics> {
  // Authorization precedes reading snapshots or registering synchronization work.
  requirePermission(user, permissionCodes.reportingWebsiteReadAll);
  const input = websiteAnalyticsQuerySchema.parse(query);
  const configuration = googleAnalyticsConfiguration();
  const heatmap = getWebsiteHeatmapConfiguration();
  const scope = input.fundingCallId ? "funding-call" : "website-wide";
  const base = {
    contractVersion: websiteAnalyticsContractVersion,
    period: input,
    comparison: null,
    synchronization: null,
    collectionStart: configuration?.collectionStart ?? null,
    gaBrowserCollectionEnabled: heatmap.googleAnalyticsEnabled,
    heatmap: {
      provider: heatmap.provider,
      state: heatmap.projectId ? "ready" : "unavailable",
      accessUrl: heatmap.projectId
        ? `https://clarity.microsoft.com/projects/view/${heatmap.projectId}/heatmaps`
        : null,
      note: "",
    } as WebsiteAnalyticsMetrics["heatmap"],
    scopes: {
      traffic: "website-wide",
      dailyTraffic: "website-wide",
      mostViewedPages: "website-wide",
      geography: "Namibia",
      fundingCallEngagement: scope,
      selfCheckJourney: scope,
      applications: scope,
      eligibility: scope,
    } as WebsiteAnalyticsMetrics["scopes"],
    coverage: "",
  };
  if (!configuration) {
    const note =
      "Configure the GA property ID, collection start date and property timezone before loading metrics.";
    return {
      ...base,
      traffic: unavailable(note),
      dailyTraffic: unavailable(note),
      mostViewedPages: unavailable(note),
      geography: unavailable(note),
      fundingCallEngagement: unavailable(note),
      selfCheckJourney: unavailable(note),
      applicationReach: unavailable(note),
      applicationFunnel: unavailable(note),
      starterCompletion: unavailable(note),
      eligibility: unavailable(
        "Set the reporting property timezone before aggregating dated checks.",
      ),
    };
  }
  const previous = previousWebsiteAnalyticsPeriod(input);
  const { current, previous: comparison } = await readStoredWebsiteAnalytics(
    input,
    configuration,
  );
  return {
    ...base,
    ...current.sources,
    synchronization: current.synchronization,
    eligibility: {
      state: current.eligibility.length ? "ready" : "no-data",
      data: current.eligibility,
      fetchedAt: new Date().toISOString(),
      metadata: null,
      note: "Anonymous advisory checks recorded with consent.",
    },
    comparison: comparison
      ? {
          period: previous,
          traffic: comparison.sources.traffic,
          applicationReach: comparison.sources.applicationReach,
          starterCompletion: comparison.sources.starterCompletion,
          changes: current.changes,
        }
      : null,
  };
}
