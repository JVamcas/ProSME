import "server-only";

import { and, eq } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  fundingOpportunityWorkflowAssignments,
  workflowAuditEntries,
  workflowDefinitionVersions,
  workflowDefinitions,
} from "@/db/schema";
import type { WorkflowOpportunityAssignment } from "@/modules/workflows/WorkflowTypes";

export async function listWorkflowAssignments() {
  return getDatabase()
    .select({
      assignedAt: fundingOpportunityWorkflowAssignments.assignedAt,
      fundingOpportunityId:
        fundingOpportunityWorkflowAssignments.fundingOpportunityId,
      fundingOpportunityTitle:
        fundingOpportunityWorkflowAssignments.fundingOpportunityTitle,
      rowVersion: fundingOpportunityWorkflowAssignments.rowVersion,
      versionNumber: workflowDefinitionVersions.versionNumber,
      workflowName: workflowDefinitions.name,
      workflowVersionId:
        fundingOpportunityWorkflowAssignments.workflowVersionId,
    })
    .from(fundingOpportunityWorkflowAssignments)
    .innerJoin(
      workflowDefinitionVersions,
      eq(
        workflowDefinitionVersions.id,
        fundingOpportunityWorkflowAssignments.workflowVersionId,
      ),
    )
    .innerJoin(
      workflowDefinitions,
      eq(workflowDefinitions.id, workflowDefinitionVersions.definitionId),
    )
    .orderBy(fundingOpportunityWorkflowAssignments.fundingOpportunityTitle);
}

export async function assignWorkflowToOpportunity(input: {
  actorId: string;
  correlationId: string;
  expectedRowVersion: number;
  fundingOpportunityId: number;
  fundingOpportunityTitle: string;
  idempotencyKey: string;
  workflowVersionId: string;
}): Promise<WorkflowOpportunityAssignment | null> {
  return getDatabase().transaction(async (transaction) => {
    const [workflow] = await transaction
      .select({
        versionNumber: workflowDefinitionVersions.versionNumber,
        workflowName: workflowDefinitions.name,
      })
      .from(workflowDefinitionVersions)
      .innerJoin(
        workflowDefinitions,
        eq(workflowDefinitions.id, workflowDefinitionVersions.definitionId),
      )
      .where(eq(workflowDefinitionVersions.id, input.workflowVersionId))
      .limit(1);
    if (!workflow) return null;
    const [current] = await transaction
      .select()
      .from(fundingOpportunityWorkflowAssignments)
      .where(
        eq(
          fundingOpportunityWorkflowAssignments.fundingOpportunityId,
          input.fundingOpportunityId,
        ),
      )
      .limit(1);
    if ((current?.rowVersion ?? 0) !== input.expectedRowVersion) return null;
    const nextVersion = input.expectedRowVersion + 1;
    const values = {
      assignedAt: new Date(),
      assignedBy: input.actorId,
      fundingOpportunityId: input.fundingOpportunityId,
      fundingOpportunityTitle: input.fundingOpportunityTitle,
      rowVersion: nextVersion,
      workflowVersionId: input.workflowVersionId,
    };
    const [assignment] = current
      ? await transaction
          .update(fundingOpportunityWorkflowAssignments)
          .set({
            assignedAt: new Date(),
            assignedBy: input.actorId,
            fundingOpportunityTitle: input.fundingOpportunityTitle,
            rowVersion: nextVersion,
            workflowVersionId: input.workflowVersionId,
          })
          .where(
            and(
              eq(
                fundingOpportunityWorkflowAssignments.fundingOpportunityId,
                input.fundingOpportunityId,
              ),
              eq(
                fundingOpportunityWorkflowAssignments.rowVersion,
                input.expectedRowVersion,
              ),
            ),
          )
          .returning()
      : await transaction
          .insert(fundingOpportunityWorkflowAssignments)
          .values(values)
          .onConflictDoNothing()
          .returning();
    if (!assignment) return null;
    const result = {
      assignedAt: assignment.assignedAt.toISOString(),
      fundingOpportunityId: assignment.fundingOpportunityId,
      fundingOpportunityTitle: assignment.fundingOpportunityTitle,
      rowVersion: assignment.rowVersion,
      versionNumber: workflow.versionNumber,
      workflowName: workflow.workflowName,
      workflowVersionId: assignment.workflowVersionId,
    };
    await transaction.insert(workflowAuditEntries).values({
      action: "FUNDING_OPPORTUNITY_WORKFLOW_ASSIGNED",
      actorId: input.actorId,
      after: result,
      before: current
        ? {
            workflowVersionId: current.workflowVersionId,
            rowVersion: current.rowVersion,
          }
        : null,
      correlationId: input.correlationId,
      idempotencyKey: input.idempotencyKey,
      targetId: String(input.fundingOpportunityId),
      targetType: "FUNDING_OPPORTUNITY",
    });
    return result;
  });
}
