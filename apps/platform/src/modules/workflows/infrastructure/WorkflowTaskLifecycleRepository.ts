import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  stageInstances,
  stageTaskDefinitions,
  workflowAuditEntries,
  workflowEvents,
  workflowInstances,
  workflowTasks,
} from "@/db/schema";
import type { WorkflowElementPermissions } from "../domain/definitions/WorkflowElementPermissions";
import type { WorkflowTaskStatus } from "../domain/runtime/WorkflowTask";
import type { WorkflowInstanceTransaction } from "./WorkflowInstanceRepository";

export type WorkflowTaskLifecycleTransaction = WorkflowInstanceTransaction;

export type LockedWorkflowTask = {
  assignedUserId: string | null;
  coiCleared: boolean;
  formRequired: boolean;
  formCompleted: boolean;
  id: string;
  permissions: WorkflowElementPermissions;
  rowVersion: number;
  stageInstanceId: string;
  status: WorkflowTaskStatus;
  workflowInstanceId: string;
};

export type PersistWorkflowTaskTransitionInput = {
  actorId: string;
  correlationId: string;
  currentStatus: WorkflowTaskStatus;
  occurredAt: Date;
  rowVersion: number;
  targetStatus: WorkflowTaskStatus;
  taskId: string;
  stageInstanceId: string;
  workflowInstanceId: string;
};

export function withWorkflowTaskLifecycleTransaction<T>(
  work: (transaction: WorkflowTaskLifecycleTransaction) => Promise<T>,
) {
  return getDatabase().transaction(work);
}

export async function lockWorkflowTaskForLifecycle(
  transaction: WorkflowTaskLifecycleTransaction,
  taskId: string,
  actorId: string,
): Promise<LockedWorkflowTask | null> {
  const [task] = await transaction
    .select({
      assignedUserId: workflowTasks.assignedUserId,
      coiCleared: sql<boolean>`app_workflow_task_coi_cleared(${workflowTasks.id}, ${actorId}::uuid)`,
      id: workflowTasks.id,
      formRequired: sql<boolean>`${workflowTasks.formVersionId} IS NOT NULL`,
      formCompleted: sql<boolean>`EXISTS (
        SELECT 1 FROM app_form_responses response
        WHERE response.workflow_task_id = ${workflowTasks.id}
          AND response.status = 'COMPLETED'
      )`,
      permissions: stageTaskDefinitions.permissions,
      rowVersion: workflowTasks.rowVersion,
      stageInstanceId: stageInstances.id,
      status: workflowTasks.status,
      workflowInstanceId: workflowInstances.id,
    })
    .from(workflowTasks)
    .innerJoin(
      stageTaskDefinitions,
      eq(stageTaskDefinitions.id, workflowTasks.workflowTaskDefinitionId),
    )
    .innerJoin(
      stageInstances,
      eq(stageInstances.id, workflowTasks.stageInstanceId),
    )
    .innerJoin(
      workflowInstances,
      eq(workflowInstances.id, stageInstances.workflowInstanceId),
    )
    .where(and(
      eq(workflowTasks.id, taskId),
      eq(stageInstances.status, "ACTIVE"),
      eq(workflowInstances.status, "ACTIVE"),
    ))
    .for("update", { of: workflowTasks })
    .limit(1);
  return task ?? null;
}

export async function persistWorkflowTaskTransition(
  transaction: WorkflowTaskLifecycleTransaction,
  input: PersistWorkflowTaskTransitionInput,
) {
  const [task] = await transaction
    .update(workflowTasks)
    .set({
      assignedUserId: input.targetStatus === "CLAIMED"
        ? input.actorId
        : undefined,
      claimedAt: input.targetStatus === "CLAIMED"
        ? input.occurredAt
        : undefined,
      completedAt: input.targetStatus === "COMPLETED"
        ? input.occurredAt
        : undefined,
      rowVersion: input.rowVersion + 1,
      startedAt: input.targetStatus === "IN_PROGRESS"
        ? input.occurredAt
        : undefined,
      status: input.targetStatus,
    })
    .where(and(
      eq(workflowTasks.id, input.taskId),
      eq(workflowTasks.rowVersion, input.rowVersion),
      eq(workflowTasks.status, input.currentStatus),
    ))
    .returning({
      assignedUserId: workflowTasks.assignedUserId,
      claimedAt: workflowTasks.claimedAt,
      completedAt: workflowTasks.completedAt,
      id: workflowTasks.id,
      rowVersion: workflowTasks.rowVersion,
      startedAt: workflowTasks.startedAt,
      status: workflowTasks.status,
    });
  if (!task) return null;

  const payload = {
    fromStatus: input.currentStatus,
    rowVersion: task.rowVersion,
    taskId: input.taskId,
    toStatus: input.targetStatus,
  };
  const action = input.targetStatus === "CLAIMED"
    ? "TASK_ASSIGNED"
    : input.targetStatus === "IN_PROGRESS"
      ? "TASK_STARTED"
      : `TASK_${input.targetStatus}`;
  await transaction.insert(workflowEvents).values({
    actorId: input.actorId,
    correlationId: input.correlationId,
    eventCode: action,
    payload,
    workflowInstanceId: input.workflowInstanceId,
  });
  await transaction.insert(workflowAuditEntries).values({
    action,
    actorId: input.actorId,
    after: {
      assignedUserId: task.assignedUserId,
      claimedAt: task.claimedAt?.toISOString() ?? null,
      completedAt: task.completedAt?.toISOString() ?? null,
      rowVersion: task.rowVersion,
      startedAt: task.startedAt?.toISOString() ?? null,
      status: task.status,
    },
    before: {
      rowVersion: input.rowVersion,
      status: input.currentStatus,
    },
    correlationId: input.correlationId,
    reason: input.targetStatus === "CLAIMED"
      ? "Task claimed by eligible user"
      : null,
    stageInstanceId: input.stageInstanceId,
    targetId: input.taskId,
    targetType: "WORKFLOW_TASK",
    taskId: input.taskId,
    workflowInstanceId: input.workflowInstanceId,
  });
  return task;
}


export async function lockTaskStageForLifecycle(
  transaction: WorkflowTaskLifecycleTransaction,
  taskId: string,
) {
  const [stage] = await transaction
    .select({ id: stageInstances.id })
    .from(stageInstances)
    .innerJoin(workflowTasks, eq(workflowTasks.stageInstanceId, stageInstances.id))
    .where(and(
      eq(workflowTasks.id, taskId),
      eq(stageInstances.status, "ACTIVE"),
    ))
    .for("update", { of: stageInstances })
    .limit(1);
  return stage?.id ?? null;
}
