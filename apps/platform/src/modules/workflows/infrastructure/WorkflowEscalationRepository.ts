import "server-only";

import { and, eq, sql } from "drizzle-orm";

import {
  workflowEscalations,
  workflowTasks,
} from "@/db/schema";
import type { EscalateConfiguration } from "../domain/actions/WorkflowActionConfiguration";
import type { WorkflowActionExecutionTransaction } from "./WorkflowActionExecutionRepository";
import { appendControlRecords } from "./WorkflowControlRepository";

type Transaction = WorkflowActionExecutionTransaction;

export async function startWorkflowEscalation(
  transaction: Transaction,
  input: {
    actionExecutionId: string;
    actorId: string;
    comment?: string;
    configuration: EscalateConfiguration;
    correlationId: string;
    reason?: string;
    stageInstanceId: string;
    taskId: string;
    workflowInstanceId: string;
    triggerOverride?: "RFI_EXPIRY";
  },
) {
  const [task] = await transaction.select({
    assignedRoleId: workflowTasks.assignedRoleId,
    assignedUserId: workflowTasks.assignedUserId,
  }).from(workflowTasks).where(eq(workflowTasks.id, input.taskId)).limit(1);
  if (!task) return null;
  const [escalation] = await transaction.insert(workflowEscalations).values({
    actionExecutionId: input.actionExecutionId,
    blockUntilResolved: input.configuration.blockUntilResolved,
    comment: input.comment,
    escalatedBy: input.actorId,
    reason: input.reason,
    responsibility: input.configuration.responsibility,
    sourceAssignedRoleId: task.assignedRoleId,
    sourceAssignedUserId: task.assignedUserId,
    stageInstanceId: input.stageInstanceId,
    targetRoleId: input.configuration.targetType === "ROLE"
      ? input.configuration.targetId
      : null,
    targetType: input.configuration.targetType,
    targetUserId: input.configuration.targetType === "USER"
      ? input.configuration.targetId
      : null,
    taskId: input.taskId,
    trigger: input.triggerOverride ?? input.configuration.trigger,
    workflowInstanceId: input.workflowInstanceId,
  }).returning({ id: workflowEscalations.id });
  if (input.configuration.responsibility === "TRANSFER") {
    await transaction.update(workflowTasks).set({
      assignedRoleId: input.configuration.targetType === "ROLE"
        ? input.configuration.targetId
        : null,
      assignedUserId: input.configuration.targetType === "USER"
        ? input.configuration.targetId
        : null,
      rowVersion: sql`${workflowTasks.rowVersion} + 1`,
    }).where(eq(workflowTasks.id, input.taskId));
    await appendControlRecords(transaction, {
      action: "TASK_ASSIGNED",
      actorId: input.actorId,
      after: {
        assignedRoleId: input.configuration.targetType === "ROLE"
          ? input.configuration.targetId
          : null,
        assignedUserId: input.configuration.targetType === "USER"
          ? input.configuration.targetId
          : null,
        escalationId: escalation.id,
      },
      before: {
        assignedRoleId: task.assignedRoleId,
        assignedUserId: task.assignedUserId,
      },
      correlationId: input.correlationId,
      stageInstanceId: input.stageInstanceId,
      targetId: input.taskId,
      targetType: "WORKFLOW_TASK",
      taskId: input.taskId,
      workflowInstanceId: input.workflowInstanceId,
    });
  }
  await appendControlRecords(transaction, {
    action: "WORKFLOW_ESCALATION_STARTED",
    actorId: input.actorId,
    after: {
      blockUntilResolved: input.configuration.blockUntilResolved,
      responsibility: input.configuration.responsibility,
      targetId: input.configuration.targetId,
      targetType: input.configuration.targetType,
      trigger: input.triggerOverride ?? input.configuration.trigger,
    },
    before: {
      assignedRoleId: task.assignedRoleId,
      assignedUserId: task.assignedUserId,
    },
    correlationId: input.correlationId,
    stageInstanceId: input.stageInstanceId,
    targetId: escalation.id,
    targetType: "WORKFLOW_ESCALATION",
    taskId: input.taskId,
    workflowInstanceId: input.workflowInstanceId,
  });
  return escalation;
}

export async function resolveActiveWorkflowEscalation(
  transaction: Transaction,
  input: {
    actorId: string;
    correlationId: string;
    resolutionActionExecutionId: string;
    stageInstanceId: string;
    taskId: string;
    workflowInstanceId: string;
  },
) {
  const resolvedAt = new Date();
  const [escalation] = await transaction.update(workflowEscalations).set({
    resolutionActionExecutionId: input.resolutionActionExecutionId,
    resolvedAt,
    resolvedBy: input.actorId,
    status: "RESOLVED",
  }).where(and(
    eq(workflowEscalations.taskId, input.taskId),
    eq(workflowEscalations.status, "ACTIVE"),
  )).returning({ id: workflowEscalations.id });
  if (!escalation) return null;
  await appendControlRecords(transaction, {
    action: "WORKFLOW_ESCALATION_RESOLVED",
    actorId: input.actorId,
    after: {
      resolutionActionExecutionId: input.resolutionActionExecutionId,
      resolvedAt: resolvedAt.toISOString(),
      status: "RESOLVED",
    },
    correlationId: input.correlationId,
    stageInstanceId: input.stageInstanceId,
    targetId: escalation.id,
    targetType: "WORKFLOW_ESCALATION",
    taskId: input.taskId,
    workflowInstanceId: input.workflowInstanceId,
  });
  return escalation;
}
