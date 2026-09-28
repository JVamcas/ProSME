import "server-only";

import { captureNotificationOccurrence } from "@/modules/notifications/application/ServerNotificationOccurrenceService";
import type {
  StageActivationTarget,
  StageActivationTransaction,
} from "../../infrastructure/StageActivationRepository";
import { loadAssignedUserSnapshots } from "../../infrastructure/WorkflowTaskAssignmentNotificationRepository";

type AssignedTask = {
  assignedUserId: string | null;
  id: string;
  name: string;
};

export type CaptureTaskAssignmentsInput = {
  assignedAt: Date;
  correlationId: string;
  stageInstanceId: string;
  target: StageActivationTarget;
  tasks: readonly AssignedTask[];
};

export async function captureWorkflowTaskAssignmentNotification(
  transaction: StageActivationTransaction,
  input: CaptureTaskAssignmentsInput,
) {
  const assignedTasks = input.tasks.filter(
    (task): task is AssignedTask & { assignedUserId: string } =>
      Boolean(task.assignedUserId),
  );
  if (assignedTasks.length === 0) return null;

  const assignees = await loadAssignedUserSnapshots(
    transaction,
    assignedTasks.map((task) => task.assignedUserId),
  );
  const sourceIdempotencyKey = `stage-activation:${input.stageInstanceId}`;

  return captureNotificationOccurrence(transaction, {
    aggregateId: input.target.applicationId,
    aggregateType: "WORKFLOW_STAGE",
    context: {
      applicationId: input.target.applicationId,
      applicationReference: input.target.applicationReference,
      assignedAt: input.assignedAt.toISOString(),
      assignees,
      correlationId: input.correlationId,
      fundingOpportunityTitle: input.target.fundingOpportunityTitle,
      sourceIdempotencyKey,
      stageInstanceId: input.stageInstanceId,
      stageName: input.target.stageName,
      tasks: assignedTasks.map((task) => ({
        assignedUserId: task.assignedUserId,
        taskId: task.id,
        taskName: task.name,
      })),
      workflowInstanceId: input.target.workflowInstanceId,
    },
    correlationId: input.correlationId,
    eventKey: "workflow.task.assigned",
    occurrenceKey: sourceIdempotencyKey,
    recipients: assignees.map((assignee) => ({
      ...assignee,
      recipientType: "ASSIGNED_USER",
      resolutionPath: "workflowTask.assignedUserId",
    })),
  });
}
