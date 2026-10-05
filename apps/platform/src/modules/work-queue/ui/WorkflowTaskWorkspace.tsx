"use client";

import { PortalErrorState } from "@/shared/ui/portal/PortalErrorState";
import { PortalLoadingState } from "@/shared/ui/portal/PortalLoadingState";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs } from "@/components/ui/tabs";
import { WorkflowTaskReviewPanel } from "@/modules/work-queue/ui/WorkflowTaskReviewPanel";
import { WorkflowEscalationTrackingPanel } from "@/modules/workflows/ui/tasks/WorkflowEscalationTrackingPanel";
import {
  useWorkflowEscalationTracking,
  useWorkflowTask,
} from "@/modules/work-queue/ui/useWorkQueue";
import { useWorkflowCoi } from "@/modules/workflows/ui/runtime/useWorkflowCoi";
import { WorkflowTaskCoiGate } from "@/modules/workflows/ui/runtime/WorkflowTaskCoiGate";
import { WorkflowTaskRfiPanel } from "@/modules/workflows/ui/rfi/WorkflowTaskRfiPanel";
import { PageShell } from "@/shared/ui/PageShell";
import { useState } from "react";

export function WorkflowTaskWorkspace({
  taskId,
  canReadAssignedTasks = true,
  canReadAllTasks = false,
  initialRequestId,
  canFollowUpRfi = false,
  canCloseRfi = false,
}: {
  canReadAssignedTasks?: boolean;
  canReadAllTasks?: boolean;
  canReadWorkflowProgress?: boolean;
  taskId: string;
  initialRequestId?: string;
  canFollowUpRfi?: boolean;
  canCloseRfi?: boolean;
}) {
  const [section, setSection] = useState(
    initialRequestId ? "information-requests" : "assigned-task",
  );
  const tracking = useWorkflowEscalationTracking(taskId, canReadAssignedTasks);
  const trackingPending = canReadAssignedTasks && tracking.isPending;
  const trackingData = canReadAssignedTasks ? tracking.data : null;
  const trackingOnly = Boolean(trackingData && !canReadAllTasks);
  const coi = useWorkflowCoi(taskId, !trackingPending && !trackingOnly);
  const query = useWorkflowTask(
    taskId,
    !trackingPending &&
      !trackingOnly &&
      Boolean(coi.data?.readOnly || coi.data?.cleared),
  );

  if (trackingPending) {
    return (
      <PortalLoadingState
        title="Loading task"
        description="Checking the current assignment."
      />
    );
  }
  if (canReadAssignedTasks && !canReadAllTasks && tracking.isError) {
    return (
      <PortalErrorState
        title="Task could not be loaded"
        description={tracking.error.message}
        onAction={() => void tracking.refetch()}
      />
    );
  }
  if (trackingData && trackingOnly) {
    return (
      <PageShell
        title="Review Assigned Task"
        actions={<StatusBadge status="ESCALATED" />}
      >
        <WorkflowEscalationTrackingPanel task={trackingData} />
      </PageShell>
    );
  }
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
  if (!coi.data.readOnly && !coi.data.cleared) {
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
  const canReadTaskRfis = canReadAssignedTasks && !coi.data.readOnly;

  return (
    <PageShell
      actions={
        <StatusBadge status={task.processingStatus ?? task.taskStatus} />
      }
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
      title={task.readOnly ? "View Workflow Task" : "Review Assigned Task"}
    >
      {trackingData ? (
        <WorkflowEscalationTrackingPanel task={trackingData} />
      ) : null}
      <Tabs
        selectedId={canReadTaskRfis ? section : "assigned-task"}
        onSelectionChange={setSection}
        accent="orange"
        ariaLabel="Workflow task sections"
        defaultSelectedId="assigned-task"
        items={[
          {
            content: <WorkflowTaskReviewPanel task={task} />,
            id: "assigned-task",
            label: task.readOnly ? "Task Details" : "Assigned Task",
          },
          ...(canReadTaskRfis
            ? [
                {
                  content: (
                    <WorkflowTaskRfiPanel
                      canClose={canCloseRfi && !task.readOnly}
                      canFollowUp={canFollowUpRfi && !task.readOnly}
                      initialRequestId={initialRequestId}
                      taskId={taskId}
                    />
                  ),
                  id: "information-requests",
                  label: "Information requests",
                },
              ]
            : []),
        ]}
        tabListClassName="border-b border-brand-navy/10 px-4"
      />
    </PageShell>
  );
}
