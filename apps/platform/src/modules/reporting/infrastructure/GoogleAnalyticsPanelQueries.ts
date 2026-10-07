import type { WebsiteAnalyticsQuery } from "../api/WebsiteAnalyticsSchemas";

function query(
  input: WebsiteAnalyticsQuery,
  dimensions: string[],
  metrics: string[],
  limit: number,
) {
  return {
    dateRanges: [{ startDate: input.startDate, endDate: input.endDate }],
    dimensions: dimensions.map((name) => ({ name })),
    metrics: metrics.map((name) => ({ name })),
    limit: String(limit),
    returnPropertyQuota: true,
  };
}

export function dailyTrafficQuery(input: WebsiteAnalyticsQuery) {
  return {
    ...query(input, ["date"], ["screenPageViews", "sessions"], 366),
    orderBys: [{ dimension: { dimensionName: "date" } }],
  };
}

export function mostViewedPagesQuery(input: WebsiteAnalyticsQuery) {
  return {
    ...query(input, ["pagePath"], ["screenPageViews"], 10),
    orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
  };
}

export function visitorRegionsQuery(input: WebsiteAnalyticsQuery) {
  return {
    ...query(input, ["region"], ["totalUsers"], 100),
    dimensionFilter: {
      filter: {
        fieldName: "country",
        stringFilter: { matchType: "EXACT", value: "Namibia" },
      },
    },
    orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
  };
}

export function fundingCallEngagementQuery(input: WebsiteAnalyticsQuery) {
  const expressions: object[] = [
    {
      filter: {
        fieldName: "eventName",
        inListFilter: {
          values: [
            "funding_call_view",
            "application_start",
            "application_submit",
          ],
        },
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
    ...query(
      input,
      ["customEvent:funding_call_id", "eventName"],
      ["totalUsers"],
      100,
    ),
    dimensionFilter: { andGroup: { expressions } },
    orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
  };
}
