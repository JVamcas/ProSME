import "server-only";

import { z } from "zod";
import { permissionCodes } from "@/auth/authorization/permissions/PermissionCodes";
import { requireCapability } from "@/auth/authorization/policy";
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
  workflowTemplateTransitions,
  type WorkflowTemplateListItem,
} from "../../domain/definitions/WorkflowTemplate";
import { createWorkflowDefinition } from "../../infrastructure/WorkflowTemplateWriteRepository";
import { updateWorkflowDefinitionDetails } from "../../infrastructure/WorkflowDetailsRepository";
import {
  changeWorkflowTemplateLifecycle,
  findLifecycleReplay,
} from "../../infrastructure/WorkflowLifecycleRepository";
import {
  findWorkflowTemplateByVersion,
  findWorkflowTemplateVersion,
  listCurrentWorkflowTemplates,
  listWorkflowTemplateAudit,
  listWorkflowTemplateVersions,
} from "../../infrastructure/WorkflowTemplateRepository";
import {
  WorkflowConflictError,
  WorkflowNotFoundError,
} from "./ServerWorkflowSupport";

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

export async function createWorkflowTemplate(
  user: AuthenticatedUser | null,
  input: CreateWorkflowTemplateInput,
  correlationId: string,
) {
  const actor = requireCapability(
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
  record: Awaited<ReturnType<typeof listCurrentWorkflowTemplates>>[number],
): WorkflowTemplateListItem {
  return {
    id: record.id,
    ...record.metadata,
    currentVersion: {
      id: record.currentVersionId,
      number: record.currentVersionNumber,
      status: record.currentVersionStatus,
    },
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function getWorkflowTemplates(
  user: AuthenticatedUser | null,
): Promise<WorkflowTemplateListItem[]> {
  requireCapability(user, permissionCodes.workflowDefinitionRead);
  const records = await listCurrentWorkflowTemplates();
  return records
    .map(toListItem)
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function getWorkflowTemplateVersion(
  user: AuthenticatedUser | null,
  templateId: string,
  versionId: string,
) {
  requireCapability(user, permissionCodes.workflowDefinitionRead);
  return requireVersion(templateId, versionId);
}

export async function getWorkflowTemplateVersions(
  user: AuthenticatedUser | null,
  templateId: string,
) {
  requireCapability(user, permissionCodes.workflowDefinitionRead);
  return listWorkflowTemplateVersions(z.string().uuid().parse(templateId));
}

export async function getWorkflowTemplateAudit(
  user: AuthenticatedUser | null,
  templateId: string,
  versionId: string,
) {
  requireCapability(user, permissionCodes.workflowDefinitionRead);
  await requireVersion(templateId, versionId);
  return listWorkflowTemplateAudit(templateId, versionId);
}

export async function updateWorkflowTemplateDraft(
  user: AuthenticatedUser | null,
  input: WorkflowTemplateUpdateInput,
  correlationId: string,
) {
  const actor = requireCapability(
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

export async function changeWorkflowTemplateStatus(
  user: AuthenticatedUser | null,
  input: WorkflowTemplateLifecycleInput,
  correlationId: string,
) {
  const parsed = workflowTemplateLifecycleSchema.parse(input);
  const actor = requireCapability(user, commandPermissions[parsed.command]);
  const record = await requireVersion(parsed.templateId, parsed.versionId);
  const transition = workflowTemplateTransitions[parsed.command];
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
  if (record.version.status !== transition.from) {
    throw new WorkflowConflictError(
      `Only ${transition.from} versions can perform ${parsed.command}.`,
    );
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
