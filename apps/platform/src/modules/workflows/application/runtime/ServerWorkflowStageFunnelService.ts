import "server-only";
import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { ResourceNotFoundError } from "@/lib/resource-errors";
import {
  workflowStageFunnelQuerySchema,
  type WorkflowStageFunnelQuery,
} from "../../api/WorkflowStageFunnelTypes";
import { readWorkflowStageFunnelScope } from "../../infrastructure/WorkflowStageFunnelScope";
import { readWorkflowStageFunnelCounts } from "../../infrastructure/WorkflowStageFunnelRepository";
import { readWorkflowStageApplications } from "../../infrastructure/WorkflowStageApplicationsRepository";
import { writeWorkflowStageFunnelExport } from "../../infrastructure/WorkflowStageFunnelExportWriter";

function requireFunnelReader(user: AuthenticatedUser | null) {
  const actor = requirePermission(
    user,
    permissionCodes.fundingApplicationAllRead,
  );
  requirePermission(actor, permissionCodes.workflowInstanceAllRead);
  return actor;
}

async function requireScope(applicationId: string) {
  const scope = await readWorkflowStageFunnelScope(applicationId);
  if (!scope) throw new ResourceNotFoundError("funding call workflow");
  return scope;
}

export async function getWorkflowStageFunnel(
  user: AuthenticatedUser | null,
  applicationId: string,
) {
  requireFunnelReader(user);
  const scope = await requireScope(applicationId);
  return {
    fundingCallTitle: scope.fundingCallTitle,
    stages: await readWorkflowStageFunnelCounts(scope.fundingCallId),
  };
}

export async function listWorkflowStageApplications(
  user: AuthenticatedUser | null,
  applicationId: string,
  input: WorkflowStageFunnelQuery,
) {
  const actor = requireFunnelReader(user);
  requirePermission(actor, permissionCodes.workflowTaskAllRead);
  const query = workflowStageFunnelQuerySchema.parse(input);
  const scope = await requireScope(applicationId);
  return {
    ...(await readWorkflowStageApplications(
      scope.fundingCallId,
      actor.id,
      query,
    )),
    page: query.page,
    pageSize: query.pageSize,
  };
}

export async function exportWorkflowStageApplications(
  user: AuthenticatedUser | null,
  applicationId: string,
  stageKey: string,
  signal: AbortSignal,
) {
  const actor = requireFunnelReader(user);
  requirePermission(actor, permissionCodes.workflowTaskAllRead);
  requirePermission(actor, permissionCodes.fundingApplicationExport);
  const query = workflowStageFunnelQuerySchema.parse({ stageKey });
  const scope = await requireScope(applicationId);
  return writeWorkflowStageFunnelExport(
    scope.fundingCallId,
    actor.id,
    query.stageKey,
    signal,
  );
}
