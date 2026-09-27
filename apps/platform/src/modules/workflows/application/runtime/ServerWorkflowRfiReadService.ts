import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import {
  can,
  requireAuthenticatedUser,
  requirePermission,
} from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { ResourceNotFoundError } from "@/lib/resource-errors";
import {
  readApplicationWorkflowRfis,
  readAssignedApplicationWorkflowRfis,
  readOwnedApplicationRfis,
  readOwnedOpenRfiActions,
  readOwnedWorkflowRfi,
  readTaskWorkflowRfi,
  readTaskWorkflowRfis,
} from "../../infrastructure/WorkflowRfiReadRepository";
import { readWorkflowTask } from "../../infrastructure/WorkflowTaskRepository";

export function listOwnedApplicationRfis(
  user: AuthenticatedUser | null,
  applicationId: string,
) {
  const actor = requirePermission(
    user,
    permissionCodes.fundingApplicationInformationRequestOwnRead,
  );
  return readOwnedApplicationRfis({
    applicationId,
    ownerUserId: actor.id,
  });
}

export function listOwnedOpenRfiActions(
  user: AuthenticatedUser | null,
  limit = 3,
) {
  const actor = requirePermission(
    user,
    permissionCodes.fundingApplicationInformationRequestOwnRead,
  );
  return readOwnedOpenRfiActions(actor.id, limit);
}

export async function getOwnedWorkflowRfi(
  user: AuthenticatedUser | null,
  applicationId: string,
  requestInformationId: string,
) {
  const actor = requirePermission(
    user,
    permissionCodes.fundingApplicationInformationRequestOwnRead,
  );
  const rfi = await readOwnedWorkflowRfi({
    applicationId,
    ownerUserId: actor.id,
    requestInformationId,
  });
  if (!rfi) throw new ResourceNotFoundError("information request");
  return rfi;
}

async function requireTaskContext(
  user: AuthenticatedUser | null,
  taskId: string,
) {
  const actor = requireAuthenticatedUser(user);
  const task = await readWorkflowTask(actor.id, taskId);
  if (!task) throw new ResourceNotFoundError("workflow task");
  requirePermission(actor, task.permissions.view);
  return actor;
}

export async function listTaskWorkflowRfis(
  user: AuthenticatedUser | null,
  taskId: string,
) {
  await requireTaskContext(user, taskId);
  return readTaskWorkflowRfis(taskId);
}

export async function getTaskWorkflowRfi(
  user: AuthenticatedUser | null,
  taskId: string,
  requestInformationId: string,
) {
  await requireTaskContext(user, taskId);
  const rfi = await readTaskWorkflowRfi({ requestInformationId, taskId });
  if (!rfi) throw new ResourceNotFoundError("information request");
  return rfi;
}

export function listContextualApplicationRfis(
  user: AuthenticatedUser | null,
  applicationId: string,
) {
  const actor = requireAuthenticatedUser(user);
  if (can(actor, permissionCodes.fundingApplicationAllRead)) {
    return readApplicationWorkflowRfis(applicationId);
  }
  requirePermission(actor, permissionCodes.workflowTaskAssignedRead);
  return readAssignedApplicationWorkflowRfis(applicationId, actor.id);
}
