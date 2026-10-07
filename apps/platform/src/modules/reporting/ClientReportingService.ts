"use client";

import { requestData } from "@/lib/client-http";
import {
  websiteAnalyticsQuerySchema,
  type WebsiteAnalyticsQuery,
} from "./api/WebsiteAnalyticsSchemas";
import type { WebsiteAnalyticsMetrics } from "./domain/WebsiteAnalyticsMetrics";

function website(query: WebsiteAnalyticsQuery, signal?: AbortSignal) {
  const input = websiteAnalyticsQuerySchema.parse(query);
  const parameters = new URLSearchParams({
    startDate: input.startDate,
    endDate: input.endDate,
  });
  if (input.fundingCallId) parameters.set("fundingCallId", input.fundingCallId);
  return requestData<WebsiteAnalyticsMetrics>(
    `/api/reporting/website?${parameters}`,
    {
      cache: "no-store",
      signal,
    },
  );
}

export const clientReportingService = { website };
