"use client";

import { PortalErrorState } from "@/components/layout/PortalErrorState";
import { PortalLoadingState } from "@/components/layout/PortalLoadingState";
import { StatusBadge } from "@/components/ui/status-badge";
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
      description="Review the application and complete the assigned task."
      title={task.taskName}
    >
      <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(24rem,1fr)] xl:gap-5">
        <section
          aria-label="Application details"
          className="order-2 min-w-0 rounded-t-2xl border border-brand-navy/10 bg-white p-3 shadow-none sm:p-4 xl:order-1 [&_.shadow-sm]:shadow-none"
        >
          <ApplicationTaskPane applicationId={task.applicationId} />
        </section>
        <section
          aria-label="Task review"
          className="order-1 min-w-0 rounded-t-2xl border border-brand-navy/10 bg-white p-3 shadow-none sm:p-4 xl:order-2 [&_.shadow-sm]:shadow-none"
        >
          <WorkflowTaskReviewPanel task={task} />
        </section>
      </div>
    </PageShell>
  );
}
