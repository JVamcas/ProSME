"use client";

import { PortalErrorState } from "@/components/layout/PortalErrorState";
import { PortalLoadingState } from "@/components/layout/PortalLoadingState";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs } from "@/components/ui/tabs";
import { useAdminApplicationDetail } from "@/modules/applications/ApplicationHooks";
import { ApplicationDetailContent } from "@/modules/applications/ui/ApplicationDetailView";
import { useWorkflowTask } from "@/modules/work-queue/WorkQueueHooks";
import { WorkflowTaskReviewPanel } from "@/modules/work-queue/ui/WorkflowTaskReviewPanel";
import { useWorkflowCoi } from "@/modules/workflows/ui/runtime/useWorkflowCoi";
import { WorkflowTaskCoiGate } from "@/modules/workflows/ui/runtime/WorkflowTaskCoiGate";
import { PageShell } from "@/shared/ui/PageShell";

function ApplicationTaskPane({ applicationId }: { applicationId: string }) {
  const query = useAdminApplicationDetail(applicationId);

  if (query.isPending) {
    return (
      <PortalLoadingState
        className="min-h-48 px-0"
        description="Preparing the submitted application."
        title="Loading application details"
      />
    );
  }

  if (query.isError) {
    return (
      <PortalErrorState
        className="mt-0 shadow-none"
        description={query.error.message}
        onAction={() => void query.refetch()}
        title="Application details could not be loaded"
      />
    );
  }

  return (
    <ApplicationDetailContent model={query.data} />
  );
}

export function WorkflowTaskWorkspace({ taskId }: { taskId: string }) {
  const coi = useWorkflowCoi(taskId);
  const query = useWorkflowTask(taskId, coi.data?.cleared ?? false);

  if (coi.isPending) {
    return (
      <PortalLoadingState
        description="Checking access to this task."
        title="Loading assignment"
      />
    );
  }
  if (coi.isError) {
    return (
      <PortalErrorState
        description={coi.error.message}
        onAction={() => void coi.refetch()}
        title="Assignment could not be loaded"
      />
    );
  }
  if (!coi.data.cleared) {
    return <WorkflowTaskCoiGate gate={coi.data} />;
  }
  if (query.isPending) {
    return (
      <PortalLoadingState
        description="Preparing the assigned review."
        title="Loading task"
      />
    );
  }
  if (query.isError) {
    return (
      <PortalErrorState
        description={query.error.message}
        onAction={() => void query.refetch()}
        title="Task could not be loaded"
      />
    );
  }

  const task = query.data;

  return (
    <PageShell
      actions={<StatusBadge status={task.taskStatus} />}
      description={
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="text-brand-navy/60">
            Stage{" "}
            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-brand-navy">
              {task.stageName}
            </span>
          </span>

          <span className="text-brand-navy/60 text-sm">
            Task{" "}
            <span className="rounded-md bg-brand-orange/10 px-2 py-0.5 font-semibold text-brand-orange">
              {task.taskName}
            </span>
          </span>
        </div>
      }
      title={`Funding Application Review`}
    >
      <Tabs
        accent="orange"
        ariaLabel="Workflow task sections"
        defaultSelectedId="assigned-task"
        items={[
          {
            content: <ApplicationTaskPane applicationId={task.applicationId} />,
            id: "application-details",
            label: "Application Details",
          },
          {
            content: <WorkflowTaskReviewPanel task={task} />,
            id: "assigned-task",
            label: "Assigned Task",
          },
        ]}
        tabListClassName="border-b border-brand-navy/10 px-4"
      />
    </PageShell>
  );
}
