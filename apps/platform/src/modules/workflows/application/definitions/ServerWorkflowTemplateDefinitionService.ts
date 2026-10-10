import "server-only";

import { z } from "zod";
import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  workflowTemplateCopySchema,
  workflowTemplateDefinitionUpdateSchema,
  type WorkflowTemplateCopyInput,
  type WorkflowTemplateDefinitionUpdateInput,
} from "../../api/WorkflowTemplateSchemas";
import { cloneWorkflowGraph } from "../../domain/definitions/WorkflowGraphCloning";
import { updateWorkflowTemplateDefinition } from "../../infrastructure/WorkflowTemplateDefinitionRepository";
import { createWorkflowDefinition } from "../../infrastructure/WorkflowTemplateWriteRepository";
import {
  loadWorkflowEditor,
  workflowEditorView,
  WorkflowConflictError,
  WorkflowNotFoundError,
} from "./ServerWorkflowSupport";

export async function editWorkflowTemplateDefinition(
  user: AuthenticatedUser | null,
  definitionId: string,
  input: WorkflowTemplateDefinitionUpdateInput,
  correlationId: string,
) {
  const actor = requirePermission(
    user,
    permissionCodes.workflowDefinitionUpdate,
  );
  const result = await updateWorkflowTemplateDefinition({
    ...workflowTemplateDefinitionUpdateSchema.parse(input),
    definitionId: z.uuid().parse(definitionId),
    correlationId: z.uuid().parse(correlationId),
    actorId: actor.id,
  });
  if (!result) throw new WorkflowConflictError();
  return result;
}

export async function copyWorkflowTemplate(
  user: AuthenticatedUser | null,
  definitionId: string,
  input: WorkflowTemplateCopyInput,
  correlationId: string,
) {
  const actor = requirePermission(
    user,
    permissionCodes.workflowDefinitionCreate,
  );
  const sourceDefinitionId = z.uuid().parse(definitionId);
  const { sourceVersionId, ...details } =
    workflowTemplateCopySchema.parse(input);
  const source = await loadWorkflowEditor(sourceVersionId);
  if (source.definition.id !== sourceDefinitionId) {
    throw new WorkflowNotFoundError();
  }
  const versionId = await createWorkflowDefinition({
    ...details,
    actorId: actor.id,
    correlationId: z.uuid().parse(correlationId),
    graph: cloneWorkflowGraph(source.graph),
    copiedFrom: {
      definitionId: source.definition.id,
      versionId: sourceVersionId,
    },
  });
  return workflowEditorView(versionId);
}
