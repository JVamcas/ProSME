import "server-only";

import { and, eq } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  fundingOpportunityWorkflowAssignments,
  workflowAuditEntries,
  workflowDefinitionVersions,
} from "@/db/schema";

type LifecycleInput = {
  actorId: string;
  correlationId: string;
  expectedRowVersion: number;
  idempotencyKey: string;
  versionId: string;
};

export async function findLifecycleReplay(idempotencyKey: string) {
  const [audit] = await getDatabase()
    .select({
      action: workflowAuditEntries.action,
      after: workflowAuditEntries.after,
      targetId: workflowAuditEntries.targetId,
    })
    .from(workflowAuditEntries)
    .where(eq(workflowAuditEntries.idempotencyKey, idempotencyKey))
    .limit(1);
  return audit ?? null;
}

async function changeLifecycle(
  input: LifecycleInput,
  fromStatus: "DRAFT" | "PUBLISHED",
  toStatus: "PUBLISHED" | "RETIRED",
) {
  return getDatabase().transaction(async (transaction) => {
    const now = new Date();
    let detachedAssignmentCount = 0;
    if (toStatus === "RETIRED") {
      const [lockedVersion] = await transaction
        .select({ id: workflowDefinitionVersions.id })
        .from(workflowDefinitionVersions)
        .where(
          and(
            eq(workflowDefinitionVersions.id, input.versionId),
            eq(workflowDefinitionVersions.status, fromStatus),
            eq(workflowDefinitionVersions.rowVersion, input.expectedRowVersion),
          ),
        )
        .for("update")
        .limit(1);
      if (!lockedVersion) return null;
      const detached = await transaction
        .delete(fundingOpportunityWorkflowAssignments)
        .where(
          eq(
            fundingOpportunityWorkflowAssignments.workflowVersionId,
            input.versionId,
          ),
        )
        .returning({
          fundingOpportunityId:
            fundingOpportunityWorkflowAssignments.fundingOpportunityId,
        });
      detachedAssignmentCount = detached.length;
    }
    const values =
      toStatus === "PUBLISHED"
        ? {
            publishedAt: now,
            publishedBy: input.actorId,
            rowVersion: input.expectedRowVersion + 1,
            status: toStatus,
            updatedAt: now,
          }
        : {
            retiredAt: now,
            rowVersion: input.expectedRowVersion + 1,
            status: toStatus,
            updatedAt: now,
          };
    const [version] = await transaction
      .update(workflowDefinitionVersions)
      .set(values)
      .where(
        and(
          eq(workflowDefinitionVersions.id, input.versionId),
          eq(workflowDefinitionVersions.status, fromStatus),
          eq(workflowDefinitionVersions.rowVersion, input.expectedRowVersion),
        ),
      )
      .returning();
    if (!version) return null;
    await transaction.insert(workflowAuditEntries).values({
      action: `WORKFLOW_VERSION_${toStatus}`,
      actorId: input.actorId,
      after: {
        detachedAssignmentCount,
        rowVersion: version.rowVersion,
        status: toStatus,
      },
      before: { rowVersion: input.expectedRowVersion, status: fromStatus },
      correlationId: input.correlationId,
      idempotencyKey: input.idempotencyKey,
      targetId: version.id,
      targetType: "WORKFLOW_VERSION",
    });
    return version;
  });
}

export function publishWorkflowVersion(input: LifecycleInput) {
  return changeLifecycle(input, "DRAFT", "PUBLISHED");
}

export function retireWorkflowVersion(input: LifecycleInput) {
  return changeLifecycle(input, "PUBLISHED", "RETIRED");
}
