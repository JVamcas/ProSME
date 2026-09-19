import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { requireCapability } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { cloneWorkflowGraph } from "@/modules/workflows/domain/definitions/WorkflowGraphCloning";
import { cloneWorkflowVersion } from "@/modules/workflows/infrastructure/WorkflowTemplateWriteRepository";
import {
  findLifecycleReplay,
  publishWorkflowVersion,
  retireWorkflowVersion,
} from "@/modules/workflows/infrastructure/WorkflowLifecycleRepository";
import { findDraftByDefinition } from "@/modules/workflows/infrastructure/WorkflowRepository";
import {
  loadWorkflowEditor,
  requireWorkflowIdempotencyKey,
  WorkflowConflictError,
  WorkflowNotFoundError,
  workflowEditorView,
} from "@/modules/workflows/application/definitions/ServerWorkflowSupport";

export async function cloneWorkflow(
  user: AuthenticatedUser | null,
  definitionId: string,
  sourceVersionId: string,
  correlationId: string,
) {
  const actor = requireCapability(user, permissionCodes.workflowDefinitionUpdate);
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
    graph: cloneWorkflowGraph(source.graph),
    sourceVersionId,
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
  const actor = requireCapability(user, permissionCodes.workflowDefinitionPublish);
  const key = requireWorkflowIdempotencyKey(idempotencyKey);
  const current = await loadWorkflowEditor(versionId);
  if (current.definition.id !== definitionId) throw new WorkflowNotFoundError();
  const replay = await lifecycleReplay(
    key,
    "WORKFLOW_VERSION_PUBLISHED",
    versionId,
  );
  if (replay) return replay;
  if (current.version.status !== "APPROVED") {
    throw new WorkflowConflictError(
      "Only approved workflow versions can be published.",
    );
  }
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
  const actor = requireCapability(user, permissionCodes.workflowDefinitionRetire);
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
