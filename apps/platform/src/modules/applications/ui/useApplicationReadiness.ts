"use client";

import { useQuery } from "@tanstack/react-query";

import { clientApplicationReadinessService } from "./ClientApplicationReadinessService";

export function useApplicationReadiness(applicationId: string) {
  return useQuery({
    queryFn: () => clientApplicationReadinessService.get(applicationId),
    queryKey: ["portal", "applications", applicationId, "readiness"],
    refetchInterval: (query) => query.state.data?.blockers.some(
      (blocker) => blocker.code === "DOCUMENT_PENDING",
    ) ? 5_000 : false,
  });
}
