import "server-only";

import type { WebsiteAnalyticsQuery } from "../api/WebsiteAnalyticsSchemas";
import type { AnalyticsSourceResult } from "../domain/WebsiteAnalyticsMetrics";
import type {
  WebsiteSourceBatch,
  WebsiteSourceName,
} from "../domain/WebsiteAnalyticsSnapshots";
import type { GoogleAnalyticsConfiguration } from "../infrastructure/GoogleAnalyticsConfiguration";
import { GoogleAnalyticsAdapter } from "../infrastructure/GoogleAnalyticsAdapter";
import { GoogleAnalyticsPanelsAdapter } from "../infrastructure/GoogleAnalyticsPanelsAdapter";

export async function synchronizeWebsiteAnalyticsSources(
  input: WebsiteAnalyticsQuery,
  configuration: GoogleAnalyticsConfiguration,
  includePanels: boolean,
): Promise<WebsiteSourceBatch> {
  const adapter = new GoogleAnalyticsAdapter(configuration);
  const panels = new GoogleAnalyticsPanelsAdapter(configuration);
  const reads: [
    WebsiteSourceName,
    () => Promise<AnalyticsSourceResult<unknown>>,
  ][] = [
    ["traffic", () => adapter.traffic(input)],
    ["applicationReach", () => adapter.reach(input)],
    ["starterCompletion", () => adapter.completion(input)],
  ];
  if (includePanels) {
    reads.push(
      ["applicationFunnel", () => adapter.applicationFunnel(input)],
      ["dailyTraffic", () => panels.dailyTraffic(input)],
      ["mostViewedPages", () => panels.pages(input)],
      ["geography", () => panels.regions(input)],
      ["fundingCallEngagement", () => panels.calls(input)],
      ["selfCheckJourney", () => panels.selfCheckJourney(input)],
      ["topUserJourneys", () => panels.journeys(input)],
    );
  }
  const results = await Promise.all(
    reads.map(async ([name, read]) => {
      try {
        return [name, await read()] as const;
      } catch {
        return [
          name,
          {
            state: "failure" as const,
            data: null,
            fetchedAt: null,
            metadata: null,
            note: "The analytics source could not be synchronized.",
          },
        ] as const;
      }
    }),
  );
  return Object.fromEntries(results);
}
