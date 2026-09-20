import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  createWorkflowDefinition,
  replaceWorkflowDraft,
} from "@/modules/workflows/infrastructure/WorkflowTemplateWriteRepository";
import { updateWorkflowDefinitionDetails } from "@/modules/workflows/infrastructure/WorkflowDetailsRepository";
import {
  findDraftByDefinition,
  findLatestWorkflowVersionId,
  listPublishedWorkflowVersions,
  listWorkflowDefinitions,
} from "@/modules/workflows/infrastructure/WorkflowRepository";
import {
  WorkflowConflictError,
  WorkflowNotFoundError,
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
) {
  requirePermission(user, permissionCodes.workflowDefinitionRead);
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
  const actor = requirePermission(user, permissionCodes.workflowDefinitionCreate);
  const versionId = await createWorkflowDefinition({
    ...input,
    actorId: actor.id,
    correlationId,
    graph: { stages: [], transitions: [] },
  });
  return workflowEditorView(versionId);
}

export async function updateWorkflowDraft(
  user: AuthenticatedUser | null,
  definitionId: string,
  input: UpdateWorkflowDraftInput,
  correlationId: string,
) {
  const actor = requirePermission(user, permissionCodes.workflowDefinitionUpdate);
  const versionId = await findDraftByDefinition(definitionId);
  if (!versionId)
    throw new WorkflowConflictError("Only draft versions can be edited.");
  const updated = await replaceWorkflowDraft({
    ...input,
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
  const actor = requirePermission(user, permissionCodes.workflowDefinitionUpdate);
  const versionId = await findDraftByDefinition(definitionId);
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
) {
  requirePermission(user, permissionCodes.workflowDefinitionUpdate);
  const versionId = await findDraftByDefinition(definitionId);
  if (!versionId)
    throw new WorkflowConflictError("Only draft versions can be edited.");
  return (await workflowEditorView(versionId)).validation;
}
