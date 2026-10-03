"use client";

import { useQuery } from "@tanstack/react-query";

import { workQueueQueryKeys } from "@/modules/work-queue/WorkQueueHooks";
import { clientWorkflowProgressService } from "../../ClientWorkflowProgressService";

export function useWorkflowProgress(
  applicationId: string,
  taskId: string,
  enabled = true,
) {
  return useQuery({
    enabled,
    queryKey: [...workQueueQueryKeys.all, "workflow-progress", applicationId, taskId],
    queryFn: () => clientWorkflowProgressService.get(applicationId, taskId),
  });
}
