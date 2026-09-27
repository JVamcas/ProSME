import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import {
  requireAuthenticatedUser,
  requirePermission,
} from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  addWorkflowRfiFollowUpSchema,
  closeWorkflowRfiSchema,
  respondToWorkflowRfiSchema,
  saveWorkflowRfiDraftSchema,
} from "../../domain/runtime/WorkflowRfiSchemas";
import { withWorkflowActionExecutionTransaction } from "../../infrastructure/WorkflowActionExecutionConnection";
import {
  addAssignedWorkflowRfiFollowUp,
  saveOwnedWorkflowRfiDraft,
} from "../../infrastructure/WorkflowRfiCorrespondenceRepository";
import {
  closeAssignedWorkflowRfi,
  respondToOwnedWorkflowRfi,
} from "../../infrastructure/WorkflowRfiLifecycleRepository";

export function respondToWorkflowRfi(
  user: AuthenticatedUser | null,
  input: unknown,
) {
  const actor = requireAuthenticatedUser(user);
  requirePermission(
    actor,
    permissionCodes.fundingApplicationInformationRequestOwnRespond,
  );
  const command = respondToWorkflowRfiSchema.parse(input);
  return withWorkflowActionExecutionTransaction((transaction) =>
    respondToOwnedWorkflowRfi(transaction, actor.id, command)
  );
}

export function closeWorkflowRfi(
  user: AuthenticatedUser | null,
  input: unknown,
) {
  const actor = requireAuthenticatedUser(user);
  requirePermission(
    actor,
    permissionCodes.fundingApplicationInformationRequestAssignedClose,
  );
  const command = closeWorkflowRfiSchema.parse(input);
  return withWorkflowActionExecutionTransaction((transaction) =>
    closeAssignedWorkflowRfi(transaction, actor.id, command)
  );
}

export function saveWorkflowRfiDraft(
  user: AuthenticatedUser | null,
  input: unknown,
) {
  const actor = requireAuthenticatedUser(user);
  requirePermission(
    actor,
    permissionCodes.fundingApplicationInformationRequestOwnRespond,
  );
  const command = saveWorkflowRfiDraftSchema.parse(input);
  return withWorkflowActionExecutionTransaction((transaction) =>
    saveOwnedWorkflowRfiDraft(transaction, actor.id, command)
  );
}

export function addWorkflowRfiFollowUp(
  user: AuthenticatedUser | null,
  taskId: string,
  input: unknown,
) {
  const actor = requireAuthenticatedUser(user);
  requirePermission(
    actor,
    permissionCodes.fundingApplicationInformationRequestCreate,
  );
  const command = addWorkflowRfiFollowUpSchema.parse(input);
  return withWorkflowActionExecutionTransaction((transaction) =>
    addAssignedWorkflowRfiFollowUp(transaction, actor.id, {
      ...command,
      taskId,
    })
  );
}
