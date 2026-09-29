import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { cloneWorkflowGraph } from "@/modules/workflows/domain/definitions/WorkflowGraphCloning";
import { cloneWorkflowVersion } from "@/modules/workflows/infrastructure/WorkflowTemplateWriteRepository";
import {
  findLifecycleReplay,
  publishWorkflowVersion,
  retireWorkflowVersion,
} from "@/modules/workflows/infrastructure/WorkflowLifecycleRepository";
import { workflowTemplatePublishableStatuses } from "@/modules/workflows/domain/definitions/WorkflowTemplate";
import type { WorkflowValidationIssue } from "@/modules/workflows/domain/definitions/WorkflowTypes";
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
  const actor = requirePermission(user, permissionCodes.workflowDefinitionUpdate);
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

function publicationValidationMessage(errors: WorkflowValidationIssue[]) {
  const shownErrors = errors
    .slice(0, 3)
    .map((error, index) =>
      `${index + 1}. ${error.message}${error.path ? ` (${error.path})` : ""}`
    )
    .join(" ");
  const remaining = errors.length - 3;
  const remainingMessage = remaining > 0
    ? ` ${remaining} more validation ${remaining === 1 ? "error" : "errors"} must also be resolved.`
    : "";
  return `Workflow cannot be published because it has ${errors.length} validation ${errors.length === 1 ? "error" : "errors"}: ${shownErrors}${remainingMessage} Open the workflow editor and resolve these issues before publishing.`;
}

export async function publishWorkflow(
  user: AuthenticatedUser | null,
  definitionId: string,
  versionId: string,
  expectedRowVersion: number,
  idempotencyKey: string | null,
  correlationId: string,
) {
  const actor = requirePermission(user, permissionCodes.workflowDefinitionPublish);
  const key = requireWorkflowIdempotencyKey(idempotencyKey);
  const current = await loadWorkflowEditor(versionId);
  if (current.definition.id !== definitionId) throw new WorkflowNotFoundError();
  const replay = await lifecycleReplay(
    key,
    "WORKFLOW_VERSION_PUBLISHED",
    versionId,
  );
  if (replay) return replay;
  if (!workflowTemplatePublishableStatuses.includes(current.version.status)) {
    throw new WorkflowConflictError(
      "Only draft or approved workflow versions can be published.",
    );
  }
  const editor = await workflowEditorView(versionId);
  if (!editor.validation.valid)
    throw new WorkflowConflictError(
      publicationValidationMessage(editor.validation.errors),
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
  const actor = requirePermission(user, permissionCodes.workflowDefinitionRetire);
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
