import "server-only";

import { captureNotificationOccurrence } from "@/modules/notifications/application/ServerNotificationOccurrenceService";
import { loadAssignedUserSnapshots } from "../../infrastructure/WorkflowTaskAssignmentNotificationRepository";
import { loadEscalationAssignmentContext } from "../../infrastructure/WorkflowEscalationAssignmentRepository";
import { startWorkflowEscalation } from "../../infrastructure/WorkflowEscalationRepository";
import { allocateStageReviewers } from "../../infrastructure/WorkflowTaskAutoAssignmentRepository";
import { failWorkflowAction } from "./WorkflowActionOutcomeSupport";

// Called inside the authorized manual action or system deadline transaction.
export async function transferWorkflowEscalation(
  transaction: Parameters<typeof startWorkflowEscalation>[0],
  input: Omit<Parameters<typeof startWorkflowEscalation>[1], "assignedUserId">,
) {
  const task = await loadEscalationAssignmentContext(transaction, input.taskId);
  if (!task) {
    failWorkflowAction("ACTION_UNAVAILABLE", "The task could not be escalated.");
  }
  const { configuration } = input;
  const currentTarget = configuration.targetType === "ROLE"
    ? task.assignedRoleId
    : task.assignedUserId;
  if (configuration.targetId === currentTarget) {
    failWorkflowAction(
      "ACTION_UNAVAILABLE",
      "Escalation must target a different user or role from the current assignee.",
    );
  }
  const allocation = await allocateStageReviewers(
    transaction,
    input.workflowInstanceId,
    [{
      excludedUserIds: task.excludedUserIds,
      id: task.definitionId,
      name: task.name,
      namedUserOverrideId: configuration.targetType === "USER"
        ? configuration.targetId
        : null,
      reviewerCount: 1,
      roleId: configuration.targetType === "ROLE"
        ? configuration.targetId
        : null,
      stableKey: task.stableKey,
    }],
  );
  const [assignedUserId] = allocation.get(task.definitionId) ?? [];
  if (!assignedUserId) {
    failWorkflowAction("ACTION_UNAVAILABLE", "No eligible escalation assignee is available.");
  }
  const escalation = await startWorkflowEscalation(transaction, { ...input, assignedUserId });
  if (!escalation) {
    failWorkflowAction("ACTION_UNAVAILABLE", "The task could not be escalated.");
  }
  const assignees = await loadAssignedUserSnapshots(transaction, [assignedUserId]);
  if (assignees.length !== 1) {
    failWorkflowAction("ACTION_UNAVAILABLE", "The new assignee could not be notified.");
  }
  const occurrenceKey = `workflow-escalation:${escalation.id}`;
  await captureNotificationOccurrence(transaction, {
    aggregateId: input.taskId,
    aggregateType: "WORKFLOW_TASK",
    context: {
      applicationId: task.applicationId,
      applicationReference: task.applicationReference,
      assignedAt: new Date().toISOString(),
      assignees,
      correlationId: input.correlationId,
      escalationId: escalation.id,
      fundingOpportunityTitle: task.fundingOpportunityTitle,
      reason: input.reason ?? input.comment ?? null,
      sourceIdempotencyKey: occurrenceKey,
      stageInstanceId: input.stageInstanceId,
      stageName: task.stageName,
      tasks: [{ assignedUserId, taskId: input.taskId, taskName: task.name }],
      trigger: input.triggerOverride ?? configuration.trigger,
      workflowInstanceId: input.workflowInstanceId,
    },
    correlationId: input.correlationId,
    eventKey: "workflow.task.escalated",
    occurrenceKey,
    recipients: assignees.map((assignee) => ({
      ...assignee,
      recipientType: "ASSIGNED_USER",
      resolutionPath: "workflowTask.assignedUserId",
    })),
  });
  return escalation;
}
