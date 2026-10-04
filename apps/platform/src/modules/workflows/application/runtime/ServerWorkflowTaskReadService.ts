import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { can, requireAnyPermission, requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { ResourceNotFoundError } from "@/lib/resource-errors";
import { readWorkflowTask } from "../../infrastructure/WorkflowTaskRepository";

export class WorkflowTaskUnavailableError extends ResourceNotFoundError {
  override readonly userMessage =
    "This task is unavailable or you do not have permission to view it.";

  constructor() {
    super("workflow task");
  }
}

export async function getReadableWorkflowTask(
  user: AuthenticatedUser | null,
  taskId: string,
) {
  const actor = requireAnyPermission(user, [
    permissionCodes.workflowTaskAssignedRead,
    permissionCodes.workflowTaskAllRead,
  ]);
  const allowAll = can(actor, permissionCodes.workflowTaskAllRead);
  const task = await readWorkflowTask(
    actor.id,
    taskId,
    allowAll,
    [...actor.capabilities],
  );
  if (!task) throw new WorkflowTaskUnavailableError();
  if (!allowAll) requirePermission(actor, task.permissions.view);

  const readOnly = !(
    task.assignedToActor &&
    task.coiCleared &&
    task.workflowStatus === "ACTIVE" &&
    ["ACTIVE", "BLOCKED"].includes(task.stageStatus) &&
    ["PENDING", "IN_PROGRESS"].includes(task.taskStatus) &&
    can(actor, permissionCodes.workflowTaskAssignedRead) &&
    can(actor, task.permissions.view) &&
    (can(actor, task.permissions.edit) || can(actor, task.permissions.decide))
  );
  return { actor, task, readOnly };
}
