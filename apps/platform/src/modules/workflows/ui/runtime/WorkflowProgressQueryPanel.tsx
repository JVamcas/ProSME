"use client";

import { PortalErrorState } from "@/shared/ui/portal/PortalErrorState";
import { PortalLoadingState } from "@/shared/ui/portal/PortalLoadingState";
import type { WorkflowProgressView } from "../../api/WorkflowProgressTypes";
import { WorkflowProgressPanel } from "../WorkflowProgressPanel";
import { useWorkflowProgress } from "./useWorkflowProgress";

export function WorkflowProgressQueryPanel({
  applicationId,
  enabled = true,
  taskId,
  initialData,
}: {
  applicationId: string;
  enabled?: boolean;
  taskId?: string;
  initialData?: WorkflowProgressView | null;
}) {
  const query = useWorkflowProgress(
    applicationId,
    taskId,
    enabled,
    initialData,
  );

  if (query.isPending) {
    return (
      <PortalLoadingState
        className="min-h-48 px-0"
        description="Preparing the application's workflow."
        title="Loading workflow progress"
      />
    );
  }

  if (query.isError) {
    return (
      <PortalErrorState
        className="mt-0 shadow-none"
        description={query.error.message}
        onAction={() => void query.refetch()}
        title="Workflow progress could not be loaded"
      />
    );
  }

  return <WorkflowProgressPanel progress={query.data} />;
}
