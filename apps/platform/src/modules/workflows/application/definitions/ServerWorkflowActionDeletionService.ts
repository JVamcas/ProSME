import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import type { WorkflowActionDeletionInput } from "../../api/WorkflowActionDeletionSchema";
import { removeWorkflowAction } from "../../domain/actions/WorkflowActionDeletion";
import { findWorkflowTemplateVersion } from "../../infrastructure/WorkflowTemplateRepository";
import { replaceWorkflowDraft } from "../../infrastructure/WorkflowTemplateWriteRepository";
import {
  loadWorkflowEditor,
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
  const record = await findWorkflowTemplateVersion(
    definitionId,
    input.versionId,
  );
  if (!record) throw new WorkflowNotFoundError();
  if (record.version.status !== "DRAFT") {
    throw new WorkflowConflictError("Only draft versions can be edited.");
  }
  const current = await loadWorkflowEditor(input.versionId);
  const stage = current.graph.stages.find(
    (candidate) => candidate.stableKey === input.stageKey,
  );
  if (!stage?.actions.some((action) => action.stableKey === input.actionKey)) {
    throw new WorkflowConflictError("The workflow action no longer exists.");
  }
  // Deletion must remain possible while unrelated draft configuration is invalid.
  // The server derives the graph; callers cannot use this command to add or edit it.
  const graph = removeWorkflowAction(
    current.graph,
    input.stageKey,
    input.actionKey,
  );
  const updated = await replaceWorkflowDraft({
    actorId: actor.id,
    correlationId,
    expectedRowVersion: input.expectedRowVersion,
    graph,
    versionId: input.versionId,
  });
  if (!updated) throw new WorkflowConflictError();
  return workflowEditorView(updated);
}
