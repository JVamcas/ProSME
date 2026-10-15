"use client";

import { requestBlob, requestData } from "@/lib/client-http";
import type {
  WorkflowStageApplicationPage,
  WorkflowStageFunnelQuery,
  WorkflowStageFunnelSummary,
} from "../../api/WorkflowStageFunnelTypes";

function endpoint(applicationId: string) {
  return `/api/applications/${encodeURIComponent(applicationId)}/workflow-stage-funnel`;
}

export const clientWorkflowStageFunnelService = {
  summary(applicationId: string, signal: AbortSignal) {
    return requestData<WorkflowStageFunnelSummary>(endpoint(applicationId), {
      cache: "no-store",
      signal,
    });
  },
  applications(
    applicationId: string,
    input: WorkflowStageFunnelQuery,
    signal: AbortSignal,
  ) {
    const query = new URLSearchParams({
      stageKey: input.stageKey,
      page: String(input.page),
      pageSize: String(input.pageSize),
    });
    return requestData<WorkflowStageApplicationPage>(
      `${endpoint(applicationId)}?${query}`,
      { cache: "no-store", signal },
    );
  },
  download(applicationId: string, stageKey: string) {
    const query = new URLSearchParams({ stageKey, download: "csv" });
    return requestBlob(`${endpoint(applicationId)}?${query}`, {
      cache: "no-store",
    });
  },
};
