import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import {
  requireAuthenticatedUser,
  requirePermission,
} from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  closeWorkflowRfiSchema,
  respondToWorkflowRfiSchema,
} from "../../domain/runtime/WorkflowRfiSchemas";
import { withWorkflowActionExecutionTransaction } from "../../infrastructure/WorkflowActionExecutionConnection";
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
