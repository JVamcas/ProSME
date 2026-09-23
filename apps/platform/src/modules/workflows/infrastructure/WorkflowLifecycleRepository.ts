import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  fundingOpportunityWorkflowAssignments,
  workflowAuditEntries,
  workflowDefinitionVersions,
} from "@/db/schema";
import {
  workflowTemplateCommandSourceStatuses,
  workflowTemplateTransitions,
  type WorkflowTemplateCommand,
} from "../domain/definitions/WorkflowTemplate";

type LifecycleInput = {
  actorId: string;
  correlationId: string;
  expectedRowVersion: number;
  idempotencyKey: string;
  versionId: string;
  reason?: string;
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

export async function changeWorkflowTemplateLifecycle(
  input: LifecycleInput,
  command: WorkflowTemplateCommand,
) {
  const transition = workflowTemplateTransitions[command];
  const sourceStatuses = workflowTemplateCommandSourceStatuses(command);
  const reason = input.reason?.trim();
  if (command === "RETURN" && !reason) {
    throw new Error("A reason is required to return a workflow to Draft.");
  }
  return getDatabase().transaction(async (transaction) => {
    const [lockedVersion] = await transaction
      .select()
      .from(workflowDefinitionVersions)
      .where(
        and(
          eq(workflowDefinitionVersions.id, input.versionId),
          inArray(workflowDefinitionVersions.status, sourceStatuses),
          eq(workflowDefinitionVersions.rowVersion, input.expectedRowVersion),
        ),
      )
      .for("update");
    if (!lockedVersion) return null;

    // Existing opportunity bindings are detached on retirement. Runtime instances
    // retain their exact version foreign key and the retired version is retained.
    let detachedAssignmentCount = 0;
    if (command === "RETIRE") {
      const detached = await transaction
        .delete(fundingOpportunityWorkflowAssignments)
        .where(
          eq(
            fundingOpportunityWorkflowAssignments.workflowVersionId,
            input.versionId,
          ),
        )
        .returning();
      detachedAssignmentCount = detached.length;
    }
    const now = new Date();
    const [version] = await transaction
      .update(workflowDefinitionVersions)
      .set({
        status: transition.to,
        rowVersion: input.expectedRowVersion + 1,
        updatedAt: now,
        ...(command === "PUBLISH"
          ? { publishedAt: now, publishedBy: input.actorId }
          : {}),
        ...(command === "RETIRE" ? { retiredAt: now } : {}),
      })
      .where(eq(workflowDefinitionVersions.id, input.versionId))
      .returning();
    await transaction.insert(workflowAuditEntries).values({
      action: `WORKFLOW_VERSION_${transition.to}`,
      actorId: input.actorId,
      after: {
        command,
        detachedAssignmentCount,
        reason: reason ?? null,
        rowVersion: version.rowVersion,
        status: transition.to,
      },
      before: {
        rowVersion: input.expectedRowVersion,
        status: lockedVersion.status,
      },
      correlationId: input.correlationId,
      idempotencyKey: input.idempotencyKey,
      targetId: version.id,
      targetType: "WORKFLOW_VERSION",
    });
    return version;
  });
}

export function publishWorkflowVersion(input: LifecycleInput) {
  return changeWorkflowTemplateLifecycle(input, "PUBLISH");
}

export function retireWorkflowVersion(input: LifecycleInput) {
  return changeWorkflowTemplateLifecycle(input, "RETIRE");
}
