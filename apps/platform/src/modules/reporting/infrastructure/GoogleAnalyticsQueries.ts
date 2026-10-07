import type { WebsiteAnalyticsQuery } from "../api/WebsiteAnalyticsSchemas";

const applicationEvents = ["application_start", "application_submit"];

function dates(input: WebsiteAnalyticsQuery) {
  return [{ startDate: input.startDate, endDate: input.endDate }];
}

export function trafficTotalsQuery(input: WebsiteAnalyticsQuery) {
  return {
    dateRanges: dates(input),
    metrics: ["totalUsers", "screenPageViews", "averageSessionDuration"].map(
      (name) => ({ name }),
    ),
    limit: "1",
    returnPropertyQuota: true,
  };
}

export function applicationReachQuery(input: WebsiteAnalyticsQuery) {
  const expressions: object[] = [
    {
      filter: {
        fieldName: "eventName",
        inListFilter: { values: applicationEvents },
      },
    },
  ];
  if (input.fundingCallId) {
    expressions.push({
      filter: {
        fieldName: "customEvent:funding_call_id",
        stringFilter: {
          matchType: "EXACT",
          value: input.fundingCallId,
          caseSensitive: false,
        },
      },
    });
  }
  return {
    dateRanges: dates(input),
    dimensions: [{ name: "eventName" }],
    metrics: [{ name: "totalUsers" }],
    dimensionFilter: { andGroup: { expressions } },
    limit: "2",
    returnPropertyQuota: true,
  };
}

export function orderedFunnelQuery(
  input: WebsiteAnalyticsQuery,
  includeCallView: boolean,
) {
  const events = includeCallView
    ? ["funding_call_view", "eligibility_check_complete", ...applicationEvents]
    : applicationEvents;
  return predefinedJourneyQuery(input, events);
}

export function predefinedJourneyQuery(
  input: WebsiteAnalyticsQuery,
  events: readonly string[],
) {
  return {
    dateRanges: dates(input),
    funnel: {
      isOpenFunnel: false,
      steps: events.map((eventName) => ({
        name: eventName,
        isDirectlyFollowedBy: false,
        filterExpression: {
          funnelEventFilter: {
            eventName,
            ...(input.fundingCallId
              ? {
                  funnelParameterFilterExpression: {
                    funnelParameterFilter: {
                      eventParameterName: "funding_call_id",
                      stringFilter: {
                        matchType: "EXACT",
                        value: input.fundingCallId,
                        caseSensitive: false,
                      },
                    },
                  },
                }
              : {}),
          },
        },
      })),
    },
    limit: String(events.length),
    returnPropertyQuota: true,
  };
}
