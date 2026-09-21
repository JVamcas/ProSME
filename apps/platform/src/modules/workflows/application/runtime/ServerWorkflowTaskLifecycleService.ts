import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import {
  requireAuthenticatedUser,
  requirePermission,
} from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from "@/lib/resource-errors";
import { canTransitionWorkflowTask } from "../../domain/runtime/WorkflowTaskLifecycle";
import type { WorkflowTaskStatus } from "../../domain/runtime/WorkflowTask";
import { completeStageInTransaction } from "./ServerStageCompletionService";
import {
  lockWorkflowTaskForLifecycle,
  persistWorkflowTaskTransition,
  withWorkflowTaskLifecycleTransaction,
} from "../../infrastructure/WorkflowTaskLifecycleRepository";

export type WorkflowTaskLifecycleInput = {
  correlationId: string;
  expectedRowVersion: number;
  taskId: string;
};

type LifecycleAction = "CLAIM" | "START" | "COMPLETE" | "CANCEL";

const targetStatusByAction: Record<LifecycleAction, WorkflowTaskStatus> = {
  CLAIM: "CLAIMED",
  START: "IN_PROGRESS",
  COMPLETE: "COMPLETED",
  CANCEL: "CANCELLED",
};

function assertTaskContext(
  action: LifecycleAction,
  actorId: string,
  task: Awaited<ReturnType<typeof lockWorkflowTaskForLifecycle>> & {},
) {
  if (action === "CLAIM") {
    if (task.assignedUserId || !task.claimableByActor) {
      throw new ResourceConflictError("This task is not available to claim.");
    }
    return;
  }
  if (action !== "CANCEL" && task.assignedUserId !== actorId) {
    throw new ResourceConflictError("This task is not assigned to you.");
  }
}

async function changeTaskState(
  user: AuthenticatedUser | null,
  input: WorkflowTaskLifecycleInput,
  action: LifecycleAction,
) {
  const actor = requireAuthenticatedUser(user);
  if (action === "CLAIM") {
    requirePermission(actor, permissionCodes.workflowTaskClaim);
  } else if (action === "CANCEL") {
    requirePermission(actor, permissionCodes.workflowTaskCancelAll);
  }

  return withWorkflowTaskLifecycleTransaction(async (transaction) => {
    const task = await lockWorkflowTaskForLifecycle(
      transaction,
      input.taskId,
      actor.id,
    );
    if (!task) throw new ResourceNotFoundError("workflow task");
    if (action === "START") requirePermission(actor, task.permissions.edit);
    if (action === "COMPLETE") requirePermission(actor, task.permissions.decide);
    if (task.rowVersion !== input.expectedRowVersion) {
      throw new ResourceConflictError("This task changed. Refresh and try again.");
    }
    assertTaskContext(action, actor.id, task);

    const targetStatus = targetStatusByAction[action];
    if (!canTransitionWorkflowTask(task.status, targetStatus)) {
      throw new ResourceConflictError(
        `Task cannot move from ${task.status} to ${targetStatus}.`,
      );
    }
    const updated = await persistWorkflowTaskTransition(transaction, {
      actorId: actor.id,
      correlationId: input.correlationId,
      currentStatus: task.status,
      occurredAt: new Date(),
      rowVersion: task.rowVersion,
      targetStatus,
      taskId: task.id,
      workflowInstanceId: task.workflowInstanceId,
    });
    if (!updated) {
      throw new ResourceConflictError("This task changed. Refresh and try again.");
    }
    if (action === "COMPLETE") {
      await completeStageInTransaction(transaction, {
        actorId: actor.id,
        correlationId: input.correlationId,
        stageInstanceId: task.stageInstanceId,
      });
    }
    return updated;
  });
}

export function claimWorkflowTask(
  user: AuthenticatedUser | null,
  input: WorkflowTaskLifecycleInput,
) {
  return changeTaskState(user, input, "CLAIM");
}

export function startWorkflowTask(
  user: AuthenticatedUser | null,
  input: WorkflowTaskLifecycleInput,
) {
  return changeTaskState(user, input, "START");
}

export function completeWorkflowTask(
  user: AuthenticatedUser | null,
  input: WorkflowTaskLifecycleInput,
) {
  return changeTaskState(user, input, "COMPLETE");
}

export function cancelWorkflowTask(
  user: AuthenticatedUser | null,
  input: WorkflowTaskLifecycleInput,
) {
  return changeTaskState(user, input, "CANCEL");
}
