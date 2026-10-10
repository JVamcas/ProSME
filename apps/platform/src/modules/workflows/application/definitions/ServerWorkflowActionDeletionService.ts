import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import type { WorkflowActionDeletionInput } from "../../api/WorkflowActionDeletionSchema";
import { deleteDraftWorkflowAction } from "../../infrastructure/WorkflowActionDeletionRepository";
import {
  workflowEditorView,
  WorkflowConflictError,
  WorkflowNotFoundError,
} from "./ServerWorkflowSupport";

export async function deleteWorkflowAction(
  user: AuthenticatedUser | null,
  definitionId: string,
  input: WorkflowActionDeletionInput,
  correlationId: string,
) {
  const actor = requirePermission(
    user,
    permissionCodes.workflowDefinitionUpdate,
  );
  const result = await deleteDraftWorkflowAction({
    ...input,
    actorId: actor.id,
    definitionId,
    correlationId,
  });
  if (result.kind === "not_found") throw new WorkflowNotFoundError();
  if (result.kind === "not_draft") {
    throw new WorkflowConflictError("Only draft versions can be edited.");
  }
  if (result.kind === "missing_action") {
    throw new WorkflowConflictError("The workflow action no longer exists.");
  }
  if (result.kind === "conflict") throw new WorkflowConflictError();
  return workflowEditorView(result.versionId);
}
