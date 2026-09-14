import "server-only";

import { capabilities } from "@/auth/authorization/capabilities";
import { requireCapability } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { cloneWorkflowVersion } from "@/db/repositories/WorkflowDraftRepository";
import {
  findLifecycleReplay,
  publishWorkflowVersion,
  retireWorkflowVersion,
} from "@/db/repositories/WorkflowLifecycleRepository";
import { findDraftByDefinition } from "@/db/repositories/WorkflowRepository";
import {
  loadWorkflowEditor,
  requireWorkflowIdempotencyKey,
  WorkflowConflictError,
  WorkflowNotFoundError,
  workflowEditorView,
} from "./ServerWorkflowSupport";

export async function cloneWorkflow(
  user: AuthenticatedUser | null,
  definitionId: string,
  sourceVersionId: string,
  correlationId: string,
) {
  const actor = requireCapability(user, capabilities.workflowDefinitionUpdate);
  const source = await loadWorkflowEditor(sourceVersionId);
  if (source.definition.id !== definitionId) throw new WorkflowNotFoundError();
  if (await findDraftByDefinition(source.definition.id)) {
    throw new WorkflowConflictError(
      "This workflow already has a mutable draft.",
    );
  }
  const versionId = await cloneWorkflowVersion({
    actorId: actor.id,
    correlationId,
    definitionId: source.definition.id,
    graph: source.graph,
  });
  return workflowEditorView(versionId);
}

async function lifecycleReplay(key: string, action: string, versionId: string) {
  const replay = await findLifecycleReplay(key);
  if (!replay) return null;
  if (replay.action !== action || replay.targetId !== versionId) {
    throw new WorkflowConflictError(
      "The idempotency key was already used for another command.",
    );
  }
  return workflowEditorView(replay.targetId);
}

export async function publishWorkflow(
  user: AuthenticatedUser | null,
  definitionId: string,
  versionId: string,
  expectedRowVersion: number,
  idempotencyKey: string | null,
  correlationId: string,
) {
  const actor = requireCapability(user, capabilities.workflowDefinitionPublish);
  const key = requireWorkflowIdempotencyKey(idempotencyKey);
  const current = await loadWorkflowEditor(versionId);
  if (current.definition.id !== definitionId) throw new WorkflowNotFoundError();
  const replay = await lifecycleReplay(
    key,
    "WORKFLOW_VERSION_PUBLISHED",
    versionId,
  );
  if (replay) return replay;
  const editor = await workflowEditorView(versionId);
  if (!editor.validation.valid)
    throw new WorkflowConflictError(
      "Resolve all workflow validation errors before publishing.",
    );
  const published = await publishWorkflowVersion({
    actorId: actor.id,
    correlationId,
    expectedRowVersion,
    idempotencyKey: key,
    versionId,
  });
  if (!published) throw new WorkflowConflictError();
  return workflowEditorView(versionId);
}

export async function retireWorkflow(
  user: AuthenticatedUser | null,
  definitionId: string,
  versionId: string,
  expectedRowVersion: number,
  idempotencyKey: string | null,
  correlationId: string,
) {
  const actor = requireCapability(user, capabilities.workflowDefinitionRetire);
  const key = requireWorkflowIdempotencyKey(idempotencyKey);
  const editor = await workflowEditorView(versionId);
  if (editor.definition.id !== definitionId) throw new WorkflowNotFoundError();
  const replay = await lifecycleReplay(
    key,
    "WORKFLOW_VERSION_RETIRED",
    versionId,
  );
  if (replay) return replay;
  const retired = await retireWorkflowVersion({
    actorId: actor.id,
    correlationId,
    expectedRowVersion,
    idempotencyKey: key,
    versionId,
  });
  if (!retired) throw new WorkflowConflictError();
  return workflowEditorView(versionId);
}
