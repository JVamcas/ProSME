"use client";

import { PortalErrorState } from "@/shared/ui/portal/PortalErrorState";
import { ApplicationSectionSkeleton } from "@/modules/applications/ui/ApplicationDetailSkeleton";
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

  if (query.isError) {
    return (
      <PortalErrorState
        headingLevel={2}
        className="mt-0 shadow-none"
        description={query.error.message}
        onAction={() => void query.refetch()}
        title="Workflow progress could not be loaded"
      />
    );
  }

  if (query.isPending) {
    return <ApplicationSectionSkeleton title="workflow progress" />;
  }

  return <WorkflowProgressPanel progress={query.data} />;
}
