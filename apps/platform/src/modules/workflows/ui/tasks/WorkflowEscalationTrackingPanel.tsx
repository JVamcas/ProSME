"use client";

import { useState } from "react";
import { toast } from "sonner";
import { WorkflowTaskActions } from "./WorkflowTaskActions";
import { ConfirmationDialog } from "@/shared/ui/ConfirmationDialog";
import { useCancelWorkflowEscalation } from "@/modules/work-queue/WorkQueueHooks";
import type { WorkflowEscalationTracking } from "../../domain/runtime/WorkflowEscalationTracking";

export function WorkflowEscalationTrackingPanel({
  task,
}: {
  task: WorkflowEscalationTracking;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const cancellation = useCancelWorkflowEscalation(task.taskId);
  const escalationId = task.id;
  async function cancel() {
    try {
      await cancellation.mutateAsync({
        escalationId,
        expectedRowVersion: task.rowVersion,
      });
      setIsOpen(false);
      toast.success("Escalation cancelled. The task is assigned to you again.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to cancel escalation.",
      );
    }
  }
  return (
    <div className="flex flex-col items-start gap-2">
      <span className="font-semibold text-brand-navy">{task.taskName}</span>
      <p className="text-xs text-brand-navy/55">Stage: {task.stageName}</p>
      <p className="text-xs text-brand-navy/65">
        Escalated to{" "}
        {task.assignedUserName ?? task.assignedRoleName ?? "another reviewer"}.
      </p>
      <WorkflowTaskActions
        actions={task.actions}
        disabled={isOpen || cancellation.isPending}
        onSelect={() => undefined}
        additionalItems={[
          {
            id: "cancel-escalation",
            label: "Cancel escalation",
            destructive: true,
            disabled: !task.canCancel,
            description: task.canCancel
              ? undefined
              : "Cancellation requires permission and an uncommitted review.",
            onAction: () => setIsOpen(true),
          },
        ]}
      />
      <ConfirmationDialog
        title="Cancel escalation"
        message="Return this unfinished task to you? Any onward escalations from yours will also be cancelled. Saved work and assignment history will be preserved."
        confirmLabel="Return task to me"
        isOpen={isOpen}
        isPending={cancellation.isPending}
        onClose={() => setIsOpen(false)}
        onConfirm={() => {
          void cancel();
        }}
      />
    </div>
  );
}
