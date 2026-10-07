"use client";

import { useQuery } from "@tanstack/react-query";
import { clientWebsiteHeatmapService } from "../../ClientWebsiteHeatmapService";
import type { HeatmapQuery } from "../../api/WebsiteHeatmapSchemas";

export function useWebsiteHeatmap(input: HeatmapQuery) {
  return useQuery({
    queryKey: ["reporting", "website", "heatmap", input],
    queryFn: ({ signal }) => clientWebsiteHeatmapService.report(input, signal),
    staleTime: 60000,
    refetchInterval: 60000,
  });
}
