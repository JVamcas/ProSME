"use client";

import { ArrowRight } from "lucide-react";
import type { AnalyticsSourceResult } from "../../domain/WebsiteAnalyticsMetrics";
import type { BoundedWebsiteRows } from "../../domain/WebsiteAnalyticsPanels";
import {
  websiteJourneyLabels,
  type WebsiteUserJourney,
} from "../../domain/WebsiteUserJourneys";
import { analyticsCount } from "./WebsiteAnalyticsFormatting";
import { WebsiteAnalyticsPanel } from "./WebsiteAnalyticsPanel";

export function WebsiteUserJourneys({
  result,
}: {
  result: AnalyticsSourceResult<BoundedWebsiteRows<WebsiteUserJourney>>;
}) {
  return (
    <WebsiteAnalyticsPanel
      title="Top user journeys"
      description="Most common routes taken by users"
      contentHeight={244}
      scope="Public website · ranked by tracked users · two or three consecutive page steps"
      result={result}
    >
      {(data) =>
        data.rows.length === 0 ? (
          <p role="status" className="py-6 text-sm text-brand-navy/70">
            No user journeys recorded for this period.
          </p>
        ) : (
          <ol
            aria-label="Top user journeys"
            className="divide-y divide-brand-blue/20 border-y border-brand-blue/20"
          >
            {data.rows.map((journey, index) => (
              <li
                key={journey.steps.join(">")}
                className="flex items-start gap-3 py-4 text-sm text-brand-navy"
              >
                <span
                  aria-hidden="true"
                  className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-blue/20 font-bold"
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 leading-6">
                    {journey.steps.map((step, stepIndex) => (
                      <span
                        key={`${step}-${stepIndex}`}
                        className="inline-flex items-center gap-2"
                      >
                        {stepIndex > 0 ? (
                          <>
                            <ArrowRight
                              aria-hidden="true"
                              className="size-4 shrink-0 text-brand-blue"
                            />
                            <span className="sr-only">then</span>
                          </>
                        ) : null}
                        <span>{websiteJourneyLabels[step]}</span>
                      </span>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-brand-navy/60">
                    {analyticsCount(journey.users)} tracked users
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )
      }
    </WebsiteAnalyticsPanel>
  );
}
