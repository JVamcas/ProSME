import { websiteJourneyLabels } from "../domain/WebsiteUserJourneys";
import type { WebsiteAnalyticsMetrics } from "../domain/WebsiteAnalyticsMetrics";

export function buildWebsiteReportSummary(metrics: WebsiteAnalyticsMetrics) {
  const traffic = metrics.traffic.data;
  const reach = metrics.applicationReach.data;
  const completion = metrics.starterCompletion.data;
  const funnel = metrics.applicationFunnel.data;
  const lines = [
    `Visitors (GA total users): ${traffic?.visitors ?? "Unavailable"}`,
    `Page views: ${traffic?.pageViews ?? "Unavailable"}`,
    `Average session duration: ${traffic?.averageSessionDurationSeconds ?? "Unavailable"} seconds`,
    `Application starters (tracked users): ${reach?.startedUsers ?? "Unavailable"}`,
    `Submitted applications (tracked users): ${reach?.submittedUsers ?? "Unavailable"}`,
    `Ordered starter completion: ${completion?.rate == null ? "Unavailable (no starters)" : `${(completion.rate * 100).toFixed(1)}%`}`,
    "",
    "Ordered application funnel",
    `Call view ${funnel?.viewedUsers ?? "Unavailable"} → eligibility check ${funnel?.completedSelfCheckUsers ?? "Unavailable"} → start ${funnel?.startedUsers ?? "Unavailable"} → submission ${funnel?.submittedUsers ?? "Unavailable"}`,
    "",
    "Most viewed pages",
    ...(metrics.mostViewedPages.data?.rows
      .slice(0, 10)
      .map((page) => `${page.path}: ${page.pageViews} views`) ?? []),
    "",
    "Funding call engagement (users may appear in multiple calls)",
    ...(metrics.fundingCallEngagement.data?.rows
      .slice(0, 10)
      .map(
        (call) =>
          `${call.fundingCallId} · ${call.event}: ${call.users} tracked users`,
      ) ?? []),
    "",
    "Namibia regions (share of summed regional counts)",
    ...(metrics.geography.data?.regions
      .slice(0, 15)
      .map(
        (region) =>
          `${region.canonicalRegion ?? region.providerRegion}: ${region.users} users (${(region.share * 100).toFixed(1)}%)`,
      ) ?? []),
    "",
    "Observed public journeys",
    ...(metrics.topUserJourneys.data?.rows
      .slice(0, 3)
      .map(
        (journey) =>
          `${journey.steps.map((step) => websiteJourneyLabels[step]).join(" → ")}: ${journey.users} tracked users`,
      ) ?? []),
    "",
    "Anonymous advisory eligibility checks",
    ...(metrics.eligibility.data?.map(
      (outcome) => `${outcome.outcome}: ${outcome.checks} checks`,
    ) ?? []),
    "",
    "Empty sections mean no recorded data for the period. Counts describe consenting visitors, not application database totals.",
  ];
  return lines.join("\n");
}
