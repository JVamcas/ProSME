"use client";

import { QuerySection } from "@/shared/ui/QuerySection";
import { QueryRefreshButton } from "@/shared/ui/QueryRefreshButton";
import { StaffApplicationRfiQueryPanel } from "@/modules/workflows/ui/rfi/ApplicationRfiQueryPanels";
import { WorkflowProgressQueryPanel } from "@/modules/workflows/ui/runtime/WorkflowProgressQueryPanel";
import { ApplicationDetailView } from "./ApplicationDetailView";
import {
  ApplicationDetailSkeleton,
  ApplicationDetailPageFrame,
} from "./ApplicationDetailSkeleton";
import { useAdminApplicationDetail } from "./useApplications";
import { useApplicationAccessCleanup } from "./useApplicationAccessCleanup";

export function StaffApplicationDetailWorkspace({
  applicationId,
  canReadWorkflow,
  initialTab,
  taskId,
}: {
  applicationId: string;
  canReadWorkflow: boolean;
  initialTab: "overview" | "workflow-progress";
  taskId?: string;
}) {
  const query = useAdminApplicationDetail(applicationId);
  useApplicationAccessCleanup(applicationId, "staff", query.error);

  if (query.isError || !query.data) {
    return (
      <ApplicationDetailPageFrame audience="staff">
        <QuerySection
          query={query}
          title="application details"
          loading={<ApplicationDetailSkeleton />}
        >
          {() => null}
        </QuerySection>
      </ApplicationDetailPageFrame>
    );
  }

  return (
    <ApplicationDetailView
      actions={
        <QueryRefreshButton
          refreshing={query.isFetching}
          onRefresh={() => void query.refetch()}
        />
      }
      model={query.data}
      initialTab={initialTab}
      requests={<StaffApplicationRfiQueryPanel applicationId={applicationId} />}
      workflowProgress={
        canReadWorkflow ? (
          <WorkflowProgressQueryPanel
            applicationId={applicationId}
            taskId={taskId}
          />
        ) : undefined
      }
    />
  );
}
