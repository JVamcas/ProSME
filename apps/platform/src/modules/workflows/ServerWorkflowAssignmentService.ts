import "server-only";

import { z } from "zod";

import { capabilities } from "@/auth/authorization/capabilities";
import { requireCapability } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  assignWorkflowToOpportunity,
  listWorkflowAssignments,
} from "@/db/repositories/WorkflowAssignmentRepository";
import { findLifecycleReplay } from "@/db/repositories/WorkflowLifecycleRepository";
import { findWorkflowVersion } from "@/db/repositories/WorkflowRepository";
import { ResourceNotFoundError } from "@/lib/resource-errors";
import {
  findPublishedFundingOpportunity,
  listPublishedFundingOpportunities,
} from "@/modules/funding-calls/ServerFundingOpportunityIntegration";
import { toWorkflowAssignment } from "./WorkflowRepresentation";
import {
  requireWorkflowIdempotencyKey,
  WorkflowConflictError,
} from "./ServerWorkflowSupport";
import type { OpportunityAssignmentInput } from "./WorkflowTransportTypes";

export async function getWorkflowAssignments(user: AuthenticatedUser | null) {
  requireCapability(user, capabilities.workflowDefinitionRead);
  return (await listWorkflowAssignments()).map(toWorkflowAssignment);
}

export async function getWorkflowOpportunities(user: AuthenticatedUser | null) {
  requireCapability(user, capabilities.workflowDefinitionRead);
  return listPublishedFundingOpportunities({ limit: 100 });
}

const assignmentResultSchema = z.object({
  assignedAt: z.string().datetime(),
  fundingOpportunityId: z.number().int().positive(),
  fundingOpportunityTitle: z.string(),
  rowVersion: z.number().int().positive(),
  versionNumber: z.number().int().positive(),
  workflowName: z.string(),
  workflowVersionId: z.string().uuid(),
});

export async function assignOpportunityWorkflow(
  user: AuthenticatedUser | null,
  input: OpportunityAssignmentInput,
  idempotencyKey: string | null,
  correlationId: string,
) {
  const actor = requireCapability(user, capabilities.workflowDefinitionUpdate);
  const key = requireWorkflowIdempotencyKey(idempotencyKey);
  const replay = await findLifecycleReplay(key);
  if (
    replay &&
    (replay.action !== "FUNDING_OPPORTUNITY_WORKFLOW_ASSIGNED" ||
      replay.targetId !== String(input.fundingOpportunityId))
  ) {
    throw new WorkflowConflictError(
      "The idempotency key was already used for another command.",
    );
  }
  if (replay) return assignmentResultSchema.parse(replay.after);
  const version = await findWorkflowVersion(input.workflowVersionId);
  if (!version || version.status !== "PUBLISHED")
    throw new WorkflowConflictError(
      "Only a published workflow version can be assigned.",
    );
  const opportunity = await findPublishedFundingOpportunity(
    input.fundingOpportunityId,
  );
  if (!opportunity)
    throw new ResourceNotFoundError("published funding opportunity");
  const assigned = await assignWorkflowToOpportunity({
    ...input,
    actorId: actor.id,
    correlationId,
    fundingOpportunityTitle: opportunity.title,
    idempotencyKey: key,
  });
  if (!assigned) throw new WorkflowConflictError();
  return assigned;
}
