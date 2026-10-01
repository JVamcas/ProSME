import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  createWorkflowDefinition,
  replaceWorkflowDraft,
} from "@/modules/workflows/infrastructure/WorkflowTemplateWriteRepository";
import { findWorkflowTemplateVersion } from "@/modules/workflows/infrastructure/WorkflowTemplateRepository";
import { updateWorkflowDefinitionDetails } from "@/modules/workflows/infrastructure/WorkflowDetailsRepository";
import {
  findDraftByDefinition,
  findLatestWorkflowVersionId,
  listPublishedWorkflowVersions,
  listWorkflowDefinitions,
} from "@/modules/workflows/infrastructure/WorkflowRepository";
import { reconcileWorkflowActionBindings } from "@/modules/workflows/domain/actions/WorkflowActionBindingPolicy";
import {
  WorkflowConflictError,
  WorkflowNotFoundError,
  loadWorkflowEditor,
  workflowEditorView,
} from "@/modules/workflows/application/definitions/ServerWorkflowSupport";
import { toWorkflowSummaries } from "@/modules/workflows/api/WorkflowRepresentation";
import type {
  CreateWorkflowInput,
  UpdateWorkflowDraftInput,
  UpdateWorkflowDetailsInput,
} from "@/modules/workflows/api/WorkflowTransportTypes";

export {
  WorkflowConflictError,
  WorkflowNotFoundError,
} from "@/modules/workflows/application/definitions/ServerWorkflowSupport";

export async function getWorkflowDefinitions(user: AuthenticatedUser | null) {
  requirePermission(user, permissionCodes.workflowDefinitionRead);
  return toWorkflowSummaries(await listWorkflowDefinitions());
}

export async function getPublishedWorkflows(user: AuthenticatedUser | null) {
  requirePermission(user, permissionCodes.workflowDefinitionRead);
  return listPublishedWorkflowVersions();
}

export async function getWorkflowEditor(
  user: AuthenticatedUser | null,
  definitionId: string,
  selectedVersionId?: string,
) {
  requirePermission(user, permissionCodes.workflowDefinitionRead);
  if (selectedVersionId) {
    const record = await findWorkflowTemplateVersion(definitionId, selectedVersionId);
    if (!record) throw new WorkflowNotFoundError();
    return workflowEditorView(selectedVersionId);
  }
  const versionId =
    (await findDraftByDefinition(definitionId)) ??
    (await findLatestWorkflowVersionId(definitionId));
  if (!versionId) throw new WorkflowNotFoundError();
  return workflowEditorView(versionId);
}

export async function createWorkflow(
  user: AuthenticatedUser | null,
  input: CreateWorkflowInput,
  correlationId: string,
) {
  const actor = requirePermission(
    user,
    permissionCodes.workflowDefinitionCreate,
  );
  const versionId = await createWorkflowDefinition({
    ...input,
    actorId: actor.id,
    correlationId,
    graph: { stages: [], transitions: [] },
  });
  return workflowEditorView(versionId);
}

async function resolveEditableVersion(definitionId: string, selectedVersionId?: string) {
  if (selectedVersionId) {
    const version = await findWorkflowTemplateVersion(definitionId, selectedVersionId);
    if (!version) throw new WorkflowNotFoundError();
    if (version.version.status !== "DRAFT") {
      throw new WorkflowConflictError("Only draft versions can be edited.");
    }
    return version.version.id;
  }
  return findDraftByDefinition(definitionId);
}

export async function updateWorkflowDraft(
  user: AuthenticatedUser | null,
  definitionId: string,
  input: UpdateWorkflowDraftInput,
  correlationId: string,
) {
  const actor = requirePermission(
    user,
    permissionCodes.workflowDefinitionUpdate,
  );
  const versionId = await resolveEditableVersion(definitionId, input.versionId);
  if (!versionId)
    throw new WorkflowConflictError("Only draft versions can be edited.");
  const current = await loadWorkflowEditor(versionId);
  const graph = reconcileWorkflowActionBindings(current.graph, input.graph);
  const updated = await replaceWorkflowDraft({
    ...input,
    graph,
    actorId: actor.id,
    correlationId,
    versionId,
  });
  if (!updated) throw new WorkflowConflictError();
  return workflowEditorView(updated);
}

export async function updateWorkflowDetails(
  user: AuthenticatedUser | null,
  definitionId: string,
  input: UpdateWorkflowDetailsInput,
  correlationId: string,
) {
  const actor = requirePermission(
    user,
    permissionCodes.workflowDefinitionUpdate,
  );
  const versionId = await resolveEditableVersion(definitionId, input.versionId);
  if (!versionId)
    throw new WorkflowConflictError("Only draft versions can be edited.");
  const updated = await updateWorkflowDefinitionDetails({
    ...input,
    actorId: actor.id,
    correlationId,
    definitionId,
    versionId,
  });
  if (!updated) throw new WorkflowConflictError();
  return workflowEditorView(updated);
}

export async function validateWorkflow(
  user: AuthenticatedUser | null,
  definitionId: string,
  selectedVersionId?: string,
) {
  requirePermission(user, permissionCodes.workflowDefinitionUpdate);
  const versionId = await resolveEditableVersion(definitionId, selectedVersionId);
  if (!versionId)
    throw new WorkflowConflictError("Only draft versions can be edited.");
  return (await workflowEditorView(versionId)).validation;
}
