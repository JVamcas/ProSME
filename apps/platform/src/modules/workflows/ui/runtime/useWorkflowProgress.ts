"use client";

import type { WorkflowProgressView } from "../../api/WorkflowProgressTypes";
import { useQuery } from "@tanstack/react-query";

import { workQueueQueryKeys } from "@/modules/work-queue/WorkQueueHooks";
import { clientWorkflowProgressService } from "../../ClientWorkflowProgressService";

export function useWorkflowProgress(
  applicationId: string,
  taskId?: string,
  enabled = true,
  initialData?: WorkflowProgressView | null,
) {
  return useQuery({
    enabled,
    initialData,
    staleTime: 0,
    refetchInterval: (query) =>
      query.state.data?.status === "ACTIVE" ? 15_000 : false,
    queryKey: [
      ...workQueueQueryKeys.all,
      "workflow-progress",
      applicationId,
      taskId,
    ],
    queryFn: () => clientWorkflowProgressService.get(applicationId, taskId),
  });
}
