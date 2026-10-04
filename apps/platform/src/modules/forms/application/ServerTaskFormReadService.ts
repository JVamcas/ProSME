import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { can, requireAnyPermission, requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { ResourceNotFoundError } from "@/lib/resource-errors";
import { readWorkflowTaskRuntimeContext } from "@/modules/workflows/infrastructure/WorkflowRuntimeContextRepository";
import { getFormRuntime } from "../infrastructure/FormRepository";
import { readFormResponse } from "../infrastructure/FormResponseRepository";
import { readWorkflowTaskFormResponse } from "../infrastructure/WorkflowTaskFormResponseRepository";
import { exposeTaskFormRuntimeContext } from "./FormTaskRuntimeContext";

function toIso(value: Date | string | null) {
  return value ? new Date(value).toISOString() : null;
}

export async function getTaskForm(
  user: AuthenticatedUser | null,
  taskInstanceId: string,
) {
  const actor = requireAnyPermission(user, [
    permissionCodes.workflowTaskAssignedRead,
    permissionCodes.workflowTaskAllRead,
  ]);
  const allowAll = can(actor, permissionCodes.workflowTaskAllRead);
  const task = await readWorkflowTaskRuntimeContext(
    actor.id,
    taskInstanceId,
    allowAll,
    [...actor.capabilities],
  );
  if (!task) {
    throw new ResourceNotFoundError("form task");
  }
  if (!allowAll) requirePermission(actor, task.permissions.view);
  const [currentSchema, response, context] = await Promise.all([
    getFormRuntime(task.binding.formVersionId),
    allowAll
      ? readWorkflowTaskFormResponse(taskInstanceId, task.binding.formVersionId)
      : readFormResponse(actor.id, taskInstanceId, task.binding.formVersionId),
    exposeTaskFormRuntimeContext(task),
  ]);
  const schema = response?.status === "COMPLETED"
    ? response.definitionSnapshot
    : currentSchema;
  if (!schema) throw new ResourceNotFoundError("published form");
  return {
    context,
    schema,
    response: response
      ? {
          ...response,
          completedAt: toIso(response.completedAt),
        }
      : null,
    taskRowVersion: Number(task.task.rowVersion),
    readOnly: allowAll && (
      task.task.assignedUserId !== actor.id ||
      !task.task.coiCleared ||
      task.workflow.status !== "ACTIVE" ||
      !["ACTIVE", "BLOCKED"].includes(String(task.stage.status)) ||
      !["PENDING", "IN_PROGRESS"].includes(String(task.task.status)) ||
      !can(actor, permissionCodes.workflowTaskAssignedRead) ||
      !can(actor, task.permissions.view) ||
      !can(actor, task.permissions.edit)
    ),
  };
}

