import type { WebsiteAnalyticsQuery } from "../api/WebsiteAnalyticsSchemas";

const dayMilliseconds = 86_400_000;

export function previousWebsiteAnalyticsPeriod(
  period: WebsiteAnalyticsQuery,
): WebsiteAnalyticsQuery {
  const start = Date.parse(period.startDate);
  const days = (Date.parse(period.endDate) - start) / dayMilliseconds + 1;
  return {
    ...period,
    startDate: new Date(start - days * dayMilliseconds)
      .toISOString()
      .slice(0, 10),
    endDate: new Date(start - dayMilliseconds).toISOString().slice(0, 10),
  };
}
