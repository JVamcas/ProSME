"use client";

import { requestData } from "@/lib/client-http";
import type { WorkflowProgressView } from "./api/WorkflowProgressTypes";

export const clientWorkflowProgressService = {
  get(applicationId: string, taskId?: string, signal?: AbortSignal) {
    const query = new URLSearchParams(taskId ? { taskId } : {});
    return requestData<WorkflowProgressView | null>(
      `/api/applications/${encodeURIComponent(applicationId)}/workflow-progress?${query}`,
      { cache: "no-store", signal },
    );
  },
};
