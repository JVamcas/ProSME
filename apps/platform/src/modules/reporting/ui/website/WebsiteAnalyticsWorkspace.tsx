"use client";
import { useState } from "react";
import { PageShell } from "@/shared/ui/PageShell";
import { Skeleton } from "@/shared/ui/Skeleton";
import { PortalErrorState } from "@/shared/ui/portal/PortalErrorState";
import type { WebsiteAnalyticsQuery } from "../../api/WebsiteAnalyticsSchemas";
import { WebsiteAnalyticsFilters } from "./WebsiteAnalyticsFilters";
import { WebsiteAnalyticsMetrics } from "./WebsiteAnalyticsMetrics";
import { WebsiteAnalyticsPanel } from "./WebsiteAnalyticsPanel";
import { WebsiteTrafficChart } from "./WebsiteTrafficChart";
import { WebsiteApplicationFunnelChart } from "./WebsiteApplicationFunnelChart";
import { WebsiteVisitorGeography } from "./WebsiteVisitorGeography";
import { WebsiteUserJourneys } from "./WebsiteUserJourneys";
import { WebsiteMostViewedPages } from "./WebsiteMostViewedPages";
import { WebsiteFundingCallEngagement } from "./WebsiteFundingCallEngagement";
import { WebsiteEligibilityChart } from "./WebsiteEligibilityChart";
import { WebsiteHeatmapPanel } from "./WebsiteHeatmapPanel";
import { useWebsiteAnalytics } from "./useWebsiteAnalytics";

export function WebsiteAnalyticsWorkspace({
  initialQuery,
  calls,
}: {
  initialQuery: WebsiteAnalyticsQuery;
  calls: { id: string; title: string }[];
}) {
  const [filters, setFilters] = useState(initialQuery);
  const query = useWebsiteAnalytics(filters);
  const data = query.data;
  const applicationScope = filters.fundingCallId
    ? "Selected funding call · tracked users"
    : "All calls · journeys may span calls";
  const heatmapPeriodKey = [
    filters.startDate,
    filters.endDate,
    filters.fundingCallId,
  ].join(":");
  return (
    <PageShell
      title="Website analytics"
      description="Visitor engagement and application journeys"
      eyebrow="Operations / Analytics"
    >
      <WebsiteAnalyticsFilters
        calls={calls}
        initialQuery={initialQuery}
        refreshing={query.isFetching}
        onChange={setFilters}
        onRefresh={() => void query.refetch()}
      />
      {query.error ? (
        <PortalErrorState
          headingLevel={2}
          title="Analytics could not be refreshed"
          description={query.error.message}
          onAction={() => void query.refetch()}
        />
      ) : null}
      {!data && !query.error ? (
        <Skeleton
          className="h-96 w-full"
          aria-label="Loading website analytics"
        />
      ) : null}
      {data ? (
        <div className="grid min-w-0 gap-4">
          {query.isFetching ? (
            <p role="status" className="sr-only">
              Refreshing website analytics
            </p>
          ) : null}
          <WebsiteAnalyticsMetrics data={data} />
          <div className="grid items-stretch gap-4 lg:grid-cols-2">
            <WebsiteAnalyticsPanel
              title="Application funnel"
              scope={applicationScope}
              result={data.applicationFunnel}
            >
              {(value) => <WebsiteApplicationFunnelChart data={value} />}
            </WebsiteAnalyticsPanel>
            <WebsiteAnalyticsPanel
              title="Website traffic Trend"
              scope="Website-wide · daily"
              result={data.dailyTraffic}
            >
              {(value) => (
                <WebsiteTrafficChart
                  data={value}
                  startDate={data.period.startDate}
                  endDate={data.period.endDate}
                />
              )}
            </WebsiteAnalyticsPanel>
          </div>
          <WebsiteAnalyticsPanel
            title="Visitor geography — Namibia"
            scope="Website-wide · Namibia only"
            result={data.geography}
          >
            {(value) => <WebsiteVisitorGeography data={value} />}
          </WebsiteAnalyticsPanel>
          <div className="grid min-w-0 items-stretch gap-4 xl:grid-cols-3">
            <WebsiteUserJourneys result={data.topUserJourneys} />
            <WebsiteAnalyticsPanel
              title="Most viewed pages"
              description="Most popular pages on the website"
              contentHeight={244}
              scope="Website-wide · top 10"
              result={data.mostViewedPages}
            >
              {(value) => <WebsiteMostViewedPages data={value} />}
            </WebsiteAnalyticsPanel>
            <WebsiteAnalyticsPanel
              title="Funding call engagement"
              description="Recorded call views and submitted applications"
              contentHeight={244}
              scope={applicationScope}
              result={data.fundingCallEngagement}
            >
              {(value) => (
                <WebsiteFundingCallEngagement data={value} calls={calls} />
              )}
            </WebsiteAnalyticsPanel>
          </div>
          <div className="grid min-w-0 items-stretch gap-4 lg:grid-cols-2">
            <WebsiteAnalyticsPanel
              title="Eligibility self-checks"
              scope={
                filters.fundingCallId
                  ? "Anonymous advisory checks · selected call"
                  : "Anonymous advisory checks · all calls"
              }
              result={data.eligibility}
            >
              {(value) => <WebsiteEligibilityChart data={value} />}
            </WebsiteAnalyticsPanel>
            <WebsiteHeatmapPanel key={heatmapPeriodKey} period={filters} />
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
