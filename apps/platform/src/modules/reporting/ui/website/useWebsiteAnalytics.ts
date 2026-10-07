"use client";

import { useQuery } from "@tanstack/react-query";
import { clientReportingService } from "../../ClientReportingService";
import type { WebsiteAnalyticsQuery } from "../../api/WebsiteAnalyticsSchemas";

export function useWebsiteAnalytics(input: WebsiteAnalyticsQuery) {
  return useQuery({
    queryKey: ["reporting", "website", input],
    queryFn: ({ signal }) => clientReportingService.website(input, signal),
    staleTime: 60_000,
    refetchInterval: (query) => {
      const state = query.state.data?.synchronization?.state;
      return state === "pending" || state === "refreshing" ? 5_000 : 60_000;
    },
  });
}
