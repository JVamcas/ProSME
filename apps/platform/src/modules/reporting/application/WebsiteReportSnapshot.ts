import type { WebsiteAnalyticsMetrics } from "../domain/WebsiteAnalyticsMetrics";
import type { WebsiteReportSnapshot } from "../domain/WebsiteReport";
import type { WebsiteSourceSnapshots } from "../domain/WebsiteAnalyticsSnapshots";
import type { ClaimedWebsiteReport } from "../infrastructure/WebsiteReportClaimRepository";
import { buildWebsiteReportSummary } from "./WebsiteReportSummary";

export function buildWebsiteReportSnapshot(
  job: ClaimedWebsiteReport,
  completed: {
    sources: WebsiteSourceSnapshots | null;
    eligibility: NonNullable<WebsiteAnalyticsMetrics["eligibility"]["data"]>;
  },
  generatedAt: string,
): WebsiteReportSnapshot {
  if (!completed.sources)
    throw new Error("Completed report sources are required.");
  const metrics: WebsiteAnalyticsMetrics = {
    ...completed.sources,
    contractVersion: "d1-v2",
    period: { startDate: job.startDate, endDate: job.endDate },
    comparison: null,
    synchronization: {
      state: "ready",
      lastAttemptAt: generatedAt,
      lastSuccessAt: generatedAt,
    },
    collectionStart: job.configuration.analytics.collectionStart,
    gaBrowserCollectionEnabled: true,
    coverage:
      "Consenting visitors only. Website-wide report; geography covers Namibia.",
    heatmap: {
      provider: "Platform",
      state: "unavailable",
      collectionEnabled: false,
      note: "Heatmap views remain available in the website analytics dashboard.",
    },
    scopes: {
      traffic: "website-wide",
      dailyTraffic: "website-wide",
      mostViewedPages: "website-wide",
      topUserJourneys: "public-website",
      geography: "Namibia",
      fundingCallEngagement: "website-wide",
      selfCheckJourney: "website-wide",
      applications: "website-wide",
      eligibility: "website-wide",
    },
    eligibility: {
      state: completed.eligibility.length ? "ready" : "no-data",
      data: completed.eligibility,
      fetchedAt: generatedAt,
      metadata: null,
      note: "Anonymous advisory checks recorded with consent.",
    },
  };
  const sourceNotes = Object.entries(completed.sources)
    .map(([name, source]) => {
      const notes = [
        `${name}: ${source.fetchedAt} (${source.metadata?.timezone ?? job.configuration.analytics.timezone})`,
      ];
      if (source.note) notes.push(source.note);
      if (source.metadata?.sampled) notes.push("Sampled data");
      if (source.metadata?.subjectToThresholding)
        notes.push("Privacy thresholding applies");
      if (source.metadata?.dataLossFromOtherRow)
        notes.push("Some values grouped into (other)");
      if (
        source.data &&
        typeof source.data === "object" &&
        "truncated" in source.data &&
        source.data.truncated
      ) {
        notes.push("Bounded top rows; additional rows omitted");
      }
      return notes.join(". ");
    })
    .join("\n");
  return {
    propertyId: job.configuration.analytics.propertyId,
    scope: "website-wide",
    metrics,
    summary: buildWebsiteReportSummary(metrics),
    sourceNotes: `${metrics.coverage}\nCollection started ${metrics.collectionStart}. Generated ${generatedAt}.\n${sourceNotes}`,
  };
}
