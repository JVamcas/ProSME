import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import {
  stageInstances,
  workflowInstances,
  workflowReferrals,
  workflowStageDefinitions,
  workflowTasks,
} from "@/db/schema";
import type { WorkflowInstanceTransaction } from "./WorkflowInstanceRepository";

/** A referral resumes existing work; it never creates a rework iteration. */
export async function loadWorkflowReferralReturn(
  transaction: WorkflowInstanceTransaction,
  referredStageInstanceId: string,
) {
  const [target] = await transaction
    .select({
      sourceTaskId: workflowTasks.id,
      targetStageDefinitionId: stageInstances.workflowStageDefinitionId,
      targetStageInstanceId: stageInstances.id,
      targetStageName: workflowStageDefinitions.name,
      workflowInstanceId: workflowInstances.id,
    })
    .from(workflowReferrals)
    .innerJoin(
      stageInstances,
      and(
        eq(stageInstances.id, workflowReferrals.sourceStageInstanceId),
        eq(
          stageInstances.workflowInstanceId,
          workflowReferrals.workflowInstanceId,
        ),
      ),
    )
    .innerJoin(
      workflowTasks,
      and(
        eq(workflowTasks.id, workflowReferrals.sourceTaskId),
        eq(workflowTasks.stageInstanceId, stageInstances.id),
      ),
    )
    .innerJoin(
      workflowStageDefinitions,
      eq(workflowStageDefinitions.id, stageInstances.workflowStageDefinitionId),
    )
    .innerJoin(
      workflowInstances,
      eq(workflowInstances.id, workflowReferrals.workflowInstanceId),
    )
    .where(
      and(
        eq(workflowReferrals.referredStageInstanceId, referredStageInstanceId),
        eq(workflowReferrals.status, "COMPLETED"),
        eq(workflowReferrals.returnToReferrer, "YES"),
        inArray(stageInstances.status, ["ACTIVE", "BLOCKED"]),
        inArray(workflowTasks.status, ["PENDING", "IN_PROGRESS"]),
        eq(workflowInstances.status, "ACTIVE"),
      ),
    )
    .limit(1);
  return target ?? null;
}

export async function routeWorkflowReferralReturn(
  transaction: WorkflowInstanceTransaction,
  target: NonNullable<Awaited<ReturnType<typeof loadWorkflowReferralReturn>>>,
) {
  // Preserve task answers, assignment and lifecycle. Active holds and other
  // referrals remain authoritative blockers; a return does not override them.
  await transaction
    .update(workflowInstances)
    .set({ currentStageInstanceId: target.targetStageInstanceId })
    .where(
      and(
        eq(workflowInstances.id, target.workflowInstanceId),
        eq(workflowInstances.status, "ACTIVE"),
      ),
    );
}
