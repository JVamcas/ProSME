import "server-only";

import { capabilities } from "@/auth/authorization/capabilities";
import { requireCapability } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  createWorkflowDefinition,
  replaceWorkflowDraft,
} from "@/db/repositories/WorkflowDraftRepository";
import { updateWorkflowDefinitionDetails } from "@/db/repositories/WorkflowDetailsRepository";
import {
  findDraftByDefinition,
  findLatestWorkflowVersionId,
  listPublishedWorkflowVersions,
  listWorkflowDefinitions,
} from "@/db/repositories/WorkflowRepository";
import { referenceWorkflow } from "./ReferenceWorkflow";
import {
  WorkflowConflictError,
  WorkflowNotFoundError,
  workflowEditorView,
} from "./ServerWorkflowSupport";
import { toWorkflowSummaries } from "./WorkflowRepresentation";
import type {
  CreateWorkflowInput,
  UpdateWorkflowDraftInput,
  UpdateWorkflowDetailsInput,
} from "./WorkflowTransportTypes";

export {
  WorkflowConflictError,
  WorkflowNotFoundError,
} from "./ServerWorkflowSupport";

export async function getWorkflowDefinitions(user: AuthenticatedUser | null) {
  requireCapability(user, capabilities.workflowDefinitionRead);
  return toWorkflowSummaries(await listWorkflowDefinitions());
}

export async function getPublishedWorkflows(user: AuthenticatedUser | null) {
  requireCapability(user, capabilities.workflowDefinitionRead);
  return listPublishedWorkflowVersions();
}

export async function getWorkflowEditor(
  user: AuthenticatedUser | null,
  definitionId: string,
) {
  requireCapability(user, capabilities.workflowDefinitionRead);
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
  const actor = requireCapability(user, capabilities.workflowDefinitionCreate);
  const graph = input.useReferenceWorkflow
    ? referenceWorkflow
    : { stages: [], transitions: [] };
  const versionId = await createWorkflowDefinition({
    ...input,
    actorId: actor.id,
    correlationId,
    graph,
  });
  return workflowEditorView(versionId);
}

export async function updateWorkflowDraft(
  user: AuthenticatedUser | null,
  definitionId: string,
  input: UpdateWorkflowDraftInput,
  correlationId: string,
) {
  const actor = requireCapability(user, capabilities.workflowDefinitionUpdate);
  const versionId =
    (await findDraftByDefinition(definitionId)) ??
    (await findLatestWorkflowVersionId(definitionId));
  if (!versionId) throw new WorkflowNotFoundError();
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
  const actor = requireCapability(user, capabilities.workflowDefinitionUpdate);
  const versionId =
    (await findDraftByDefinition(definitionId)) ??
    (await findLatestWorkflowVersionId(definitionId));
  if (!versionId) throw new WorkflowNotFoundError();
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
  requireCapability(user, capabilities.workflowDefinitionUpdate);
  const versionId = await findDraftByDefinition(definitionId);
  if (!versionId) throw new WorkflowNotFoundError();
  return (await workflowEditorView(versionId)).validation;
}
