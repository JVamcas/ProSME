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
} from "@/modules/work-queue/WorkQueueHooks";
import { useWorkflowCoi } from "@/modules/workflows/ui/runtime/useWorkflowCoi";
import { WorkflowTaskCoiGate } from "@/modules/workflows/ui/runtime/WorkflowTaskCoiGate";
import { PageShell } from "@/shared/ui/PageShell";
import { useState } from "react";

export function WorkflowTaskWorkspace({
  taskId,
}: {
  canReadWorkflowProgress?: boolean;
  taskId: string;
}) {
  const [section, setSection] = useState("assigned-task");
  const tracking = useWorkflowEscalationTracking(taskId);
  const coi = useWorkflowCoi(taskId, !tracking.isPending && !tracking.data);
  const query = useWorkflowTask(
    taskId,
    !tracking.isPending && !tracking.data && (coi.data?.cleared ?? false),
  );

  if (tracking.isPending) {
    return (
      <PortalLoadingState
        title="Loading task"
        description="Checking the current assignment."
      />
    );
  }
  if (tracking.isError) {
    return (
      <PortalErrorState
        title="Task could not be loaded"
        description={tracking.error.message}
        onAction={() => void tracking.refetch()}
      />
    );
  }
  if (tracking.data) {
    return (
      <PageShell
        title="Review Assigned Task"
        actions={<StatusBadge status="ESCALATED" />}
      >
        <WorkflowEscalationTrackingPanel task={tracking.data} />
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
      title={`Review Assigned Task`}
    >
      <Tabs
        selectedId={section}
        onSelectionChange={setSection}
        accent="orange"
        ariaLabel="Workflow task sections"
        defaultSelectedId="assigned-task"
        items={[
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
