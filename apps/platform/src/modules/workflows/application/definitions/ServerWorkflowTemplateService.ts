import "server-only";

import { z } from "zod";
import { permissionCodes } from "@/auth/authorization/permissions/PermissionCodes";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  workflowTemplateDetailsSchema,
  workflowTemplateLifecycleSchema,
  workflowTemplateUpdateSchema,
  workflowTemplateVersionReferenceSchema,
  type WorkflowTemplateLifecycleInput,
  type WorkflowTemplateUpdateInput,
  type CreateWorkflowTemplateInput,
} from "../../api/WorkflowTemplateSchemas";
import {
  workflowTemplateCommandSourceStatuses,
  workflowTemplateTransitions,
  type WorkflowTemplateListItem,
  type WorkflowTemplatePage,
} from "../../domain/definitions/WorkflowTemplate";
import { createWorkflowDefinition } from "../../infrastructure/WorkflowTemplateWriteRepository";
import { updateWorkflowDefinitionDetails } from "../../infrastructure/WorkflowDetailsRepository";
import { deleteWorkflowDefinition } from "../../infrastructure/WorkflowDetailsRepository";
import {
  changeWorkflowTemplateLifecycle,
  findLifecycleReplay,
} from "../../infrastructure/WorkflowLifecycleRepository";
import { findWorkflowGraph } from "../../infrastructure/WorkflowGraphRepository";
import {
  findWorkflowTemplateByVersion,
  findWorkflowTemplateVersion,
  listWorkflowTemplatePage,
  listWorkflowTemplateAudit,
  listWorkflowTemplateVersions,
} from "../../infrastructure/WorkflowTemplateRepository";
import {
  WorkflowConflictError,
  WorkflowNotFoundError,
} from "./ServerWorkflowSupport";
import { validateWorkflowGraph } from "../../WorkflowValidation";
import { validateStoredWorkflowConditions } from "./ServerWorkflowConditionValidation";

const commandPermissions = {
  SUBMIT: permissionCodes.workflowDefinitionSubmit,
  RETURN: permissionCodes.workflowDefinitionReturn,
  APPROVE: permissionCodes.workflowDefinitionApprove,
  PUBLISH: permissionCodes.workflowDefinitionPublish,
  RETIRE: permissionCodes.workflowDefinitionRetire,
} as const;

async function requireVersion(templateId: string, versionId: string) {
  const reference = workflowTemplateVersionReferenceSchema.parse({
    templateId,
    versionId,
  });
  const record = await findWorkflowTemplateVersion(
    reference.templateId,
    reference.versionId,
  );
  if (!record) throw new WorkflowNotFoundError();
  return record;
}

async function requireValidWorkflowStructure(versionId: string) {
  const record = await findWorkflowGraph(versionId);
  if (!record) throw new WorkflowNotFoundError();
  const structure = validateWorkflowGraph(record.graph);
  const conditionErrors = structure.valid
    ? await validateStoredWorkflowConditions(record.graph)
    : [];
  if (!structure.valid || conditionErrors.length) {
    throw new WorkflowConflictError(
      "Resolve all workflow validation errors before approval or publication.",
    );
  }
}

export async function createWorkflowTemplate(
  user: AuthenticatedUser | null,
  input: CreateWorkflowTemplateInput,
  correlationId: string,
) {
  const actor = requirePermission(
    user,
    permissionCodes.workflowDefinitionCreate,
  );
  const details = workflowTemplateDetailsSchema.parse(input);
  const versionId = await createWorkflowDefinition({
    ...details,
    actorId: actor.id,
    correlationId: z.string().uuid().parse(correlationId),
    graph: { stages: [], transitions: [] },
  });
  const version = await findWorkflowTemplateByVersion(versionId);
  if (!version) throw new WorkflowNotFoundError();
  return requireVersion(version.definitionId, version.id);
}

function toListItem(
  record: Awaited<ReturnType<typeof listWorkflowTemplatePage>>["items"][number],
): WorkflowTemplateListItem {
  return {
    id: record.id,
    ...record.metadata,
    isLatest: record.isLatest,
    currentVersion: {
      id: record.currentVersionId,
      number: record.currentVersionNumber,
      rowVersion: record.currentVersionRowVersion,
      status: record.currentVersionStatus,
    },
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function getWorkflowTemplates(
  user: AuthenticatedUser | null,
  page: number,
  pageSize: number,
): Promise<WorkflowTemplatePage> {
  requirePermission(user, permissionCodes.workflowDefinitionRead);
  const result = await listWorkflowTemplatePage(page, pageSize);
  return {
    items: result.items.map(toListItem),
    page,
    pageSize,
    total: result.total,
    totalPages: Math.ceil(result.total / pageSize),
  };
}

export async function getWorkflowTemplateVersion(
  user: AuthenticatedUser | null,
  templateId: string,
  versionId: string,
) {
  requirePermission(user, permissionCodes.workflowDefinitionRead);
  return requireVersion(templateId, versionId);
}

export async function getWorkflowTemplateVersions(
  user: AuthenticatedUser | null,
  templateId: string,
) {
  requirePermission(user, permissionCodes.workflowDefinitionRead);
  return listWorkflowTemplateVersions(z.string().uuid().parse(templateId));
}

export async function getWorkflowTemplateAudit(
  user: AuthenticatedUser | null,
  templateId: string,
  versionId: string,
) {
  requirePermission(user, permissionCodes.workflowDefinitionRead);
  await requireVersion(templateId, versionId);
  return listWorkflowTemplateAudit(templateId, versionId);
}

export async function updateWorkflowTemplateDraft(
  user: AuthenticatedUser | null,
  input: WorkflowTemplateUpdateInput,
  correlationId: string,
) {
  const actor = requirePermission(
    user,
    permissionCodes.workflowDefinitionUpdate,
  );
  const parsed = workflowTemplateUpdateSchema.parse(input);
  const record = await requireVersion(parsed.templateId, parsed.versionId);
  if (record.version.status !== "DRAFT") {
    throw new WorkflowConflictError("Only draft versions can be edited.");
  }
  const updated = await updateWorkflowDefinitionDetails({
    ...parsed,
    definitionId: parsed.templateId,
    actorId: actor.id,
    correlationId: z.string().uuid().parse(correlationId),
  });
  if (!updated) throw new WorkflowConflictError();
  return requireVersion(parsed.templateId, parsed.versionId);
}

export async function deleteWorkflowTemplate(
  user: AuthenticatedUser | null,
  definitionId: string,
  versionId: string,
  expectedRowVersion: number,
  correlationId: string,
) {
  const actor = requirePermission(
    user,
    permissionCodes.workflowDefinitionUpdate,
  );
  const deleted = await deleteWorkflowDefinition({
    actorId: actor.id,
    correlationId: z.string().uuid().parse(correlationId),
    definitionId: z.string().uuid().parse(definitionId),
    expectedRowVersion,
    versionId: z.string().uuid().parse(versionId),
  });
  if (!deleted) {
    throw new WorkflowConflictError(
      "Only a draft workflow template can be deleted.",
    );
  }
  return { id: definitionId };
}

export async function changeWorkflowTemplateStatus(
  user: AuthenticatedUser | null,
  input: WorkflowTemplateLifecycleInput,
  correlationId: string,
) {
  const parsed = workflowTemplateLifecycleSchema.parse(input);
  const actor = requirePermission(user, commandPermissions[parsed.command]);
  const record = await requireVersion(parsed.templateId, parsed.versionId);
  const transition = workflowTemplateTransitions[parsed.command];
  const sourceStatuses = workflowTemplateCommandSourceStatuses(parsed.command);
  const reason = parsed.command === "RETURN" ? parsed.reason : undefined;
  const replay = await findLifecycleReplay(parsed.idempotencyKey);
  if (replay) {
    if (
      replay.action !== `WORKFLOW_VERSION_${transition.to}` ||
      replay.targetId !== parsed.versionId ||
      replay.after?.command !== parsed.command ||
      replay.after?.rowVersion !== parsed.expectedRowVersion + 1 ||
      replay.after?.reason !== (reason ?? null)
    ) {
      throw new WorkflowConflictError(
        "The idempotency key was already used for another command.",
      );
    }
    return record;
  }
  if (!sourceStatuses.includes(record.version.status)) {
    throw new WorkflowConflictError(
      `Only ${sourceStatuses.join(" or ")} versions can perform ${parsed.command}.`,
    );
  }
  if (parsed.command === "APPROVE" || parsed.command === "PUBLISH") {
    await requireValidWorkflowStructure(parsed.versionId);
  }
  const updated = await changeWorkflowTemplateLifecycle(
    {
      ...parsed,
      actorId: actor.id,
      correlationId: z.string().uuid().parse(correlationId),
      reason,
    },
    parsed.command,
  );
  if (!updated) throw new WorkflowConflictError();
  return requireVersion(parsed.templateId, parsed.versionId);
}
