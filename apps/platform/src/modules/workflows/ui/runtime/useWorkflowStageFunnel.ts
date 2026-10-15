"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { clientWorkflowStageFunnelService } from "./ClientWorkflowStageFunnelService";
import type { WorkflowStageFunnelQuery } from "../../api/WorkflowStageFunnelTypes";
import { workQueueQueryKeys } from "@/modules/work-queue/ui/WorkQueueQueryKeys";

const funnelKey = (applicationId: string) => [
  ...workQueueQueryKeys.all,
  "stage-funnel",
  applicationId,
];

export function useWorkflowStageFunnel(applicationId: string) {
  return useQuery({
    queryKey: funnelKey(applicationId),
    queryFn: ({ signal }) =>
      clientWorkflowStageFunnelService.summary(applicationId, signal),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useWorkflowStageApplications(
  applicationId: string,
  query: WorkflowStageFunnelQuery,
) {
  return useQuery({
    queryKey: [...funnelKey(applicationId), "applications", query],
    queryFn: ({ signal }) =>
      clientWorkflowStageFunnelService.applications(
        applicationId,
        query,
        signal,
      ),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useDownloadWorkflowStageApplications(applicationId: string) {
  return useMutation({
    mutationFn: (stageKey: string) =>
      clientWorkflowStageFunnelService.download(applicationId, stageKey),
  });
}
