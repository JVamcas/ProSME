import "server-only";

import { and, eq } from "drizzle-orm";

import {
  workflowAuditEntries,
  workflowEvents,
  workflowReferrals,
  workflowReworks,
} from "@/db/schema";
import type { WorkflowActionExecutionTransaction } from "./WorkflowActionExecutionRepository";

import {
  loadWorkflowReferralReturn,
  routeWorkflowReferralReturn,
} from "./WorkflowReferralRoutingRepository";

type ControlTransaction = WorkflowActionExecutionTransaction;

export async function appendControlRecords(
  transaction: ControlTransaction,
  input: {
    action: string;
    actorId: string;
    after: Record<string, unknown>;
    before?: Record<string, unknown> | null;
    correlationId: string;
    stageInstanceId: string;
    targetId: string;
    targetType: string;
    taskId?: string | null;
    workflowInstanceId: string;
  },
) {
  await transaction.insert(workflowEvents).values({
    actorId: input.actorId,
    correlationId: input.correlationId,
    eventCode: input.action,
    payload: input.after,
    workflowInstanceId: input.workflowInstanceId,
  });
  await transaction.insert(workflowAuditEntries).values({
    action: input.action,
    actorId: input.actorId,
    after: input.after,
    before: input.before ?? null,
    correlationId: input.correlationId,
    stageInstanceId: input.stageInstanceId,
    targetId: input.targetId,
    targetType: input.targetType,
    taskId: input.taskId ?? null,
    workflowInstanceId: input.workflowInstanceId,
  });
}

export async function recordWorkflowRework(
  transaction: ControlTransaction,
  input: {
    actionExecutionId: string;
    actorId: string;
    continuationStageInstanceId: string;
    correlationId: string;
    dataHandling: "RETAIN" | "CLEAR";
    reason?: string;
    sourceStageInstanceId: string;
    sourceTaskId: string | null;
    targetStageInstanceId: string;
    workflowInstanceId: string;
  },
) {
  const [rework] = await transaction
    .insert(workflowReworks)
    .values({
      actionExecutionId: input.actionExecutionId,
      continuationStageInstanceId: input.continuationStageInstanceId,
      createdBy: input.actorId,
      dataHandling: input.dataHandling,
      reason: input.reason,
      sourceStageInstanceId: input.sourceStageInstanceId,
      sourceTaskId: input.sourceTaskId,
      targetStageInstanceId: input.targetStageInstanceId,
      workflowInstanceId: input.workflowInstanceId,
    })
    .returning({ id: workflowReworks.id });
  await appendControlRecords(transaction, {
    action: "WORKFLOW_REWORK_STARTED",
    actorId: input.actorId,
    after: {
      actionExecutionId: input.actionExecutionId,
      continuationStageInstanceId: input.continuationStageInstanceId,
      dataHandling: input.dataHandling,
      sourceStageInstanceId: input.sourceStageInstanceId,
      targetStageInstanceId: input.targetStageInstanceId,
    },
    correlationId: input.correlationId,
    stageInstanceId: input.sourceStageInstanceId,
    targetId: rework.id,
    targetType: "WORKFLOW_REWORK",
    taskId: input.sourceTaskId,
    workflowInstanceId: input.workflowInstanceId,
  });
  return rework;
}

export async function hasActiveWorkflowReferral(
  transaction: ControlTransaction,
  sourceTaskId: string,
) {
  const [referral] = await transaction
    .select({ id: workflowReferrals.id })
    .from(workflowReferrals)
    .where(
      and(
        eq(workflowReferrals.sourceTaskId, sourceTaskId),
        eq(workflowReferrals.status, "ACTIVE"),
      ),
    )
    .limit(1);
  return Boolean(referral);
}

export async function recordWorkflowReferral(
  transaction: ControlTransaction,
  input: {
    actionExecutionId: string;
    actorId: string;
    correlationId: string;
    question: string;
    referredStageInstanceId: string;
    returnToReferrer: boolean;
    sourceStageInstanceId: string;
    sourceTaskBehavior: "BLOCKED" | "OPEN";
    sourceTaskId: string;
    workflowInstanceId: string;
  },
) {
  const [referral] = await transaction
    .insert(workflowReferrals)
    .values({
      actionExecutionId: input.actionExecutionId,
      question: input.question,
      referredBy: input.actorId,
      referredStageInstanceId: input.referredStageInstanceId,
      returnToReferrer: input.returnToReferrer ? "YES" : "NO",
      sourceStageInstanceId: input.sourceStageInstanceId,
      sourceTaskBehavior: input.sourceTaskBehavior,
      sourceTaskId: input.sourceTaskId,
      workflowInstanceId: input.workflowInstanceId,
    })
    .returning({ id: workflowReferrals.id });
  await appendControlRecords(transaction, {
    action: "WORKFLOW_REFERRAL_STARTED",
    actorId: input.actorId,
    after: {
      actionExecutionId: input.actionExecutionId,
      question: input.question,
      referredStageInstanceId: input.referredStageInstanceId,
      returnToReferrer: input.returnToReferrer,
      sourceTaskBehavior: input.sourceTaskBehavior,
    },
    correlationId: input.correlationId,
    stageInstanceId: input.sourceStageInstanceId,
    targetId: referral.id,
    targetType: "WORKFLOW_REFERRAL",
    taskId: input.sourceTaskId,
    workflowInstanceId: input.workflowInstanceId,
  });
  return referral;
}

export async function completeWorkflowReferralForStage(
  transaction: ControlTransaction,
  input: {
    actorId: string;
    correlationId: string;
    referredStageInstanceId: string;
  },
) {
  const resolvedAt = new Date();
  const [referral] = await transaction
    .update(workflowReferrals)
    .set({
      resolvedAt,
      resolvedBy: input.actorId,
      status: "COMPLETED",
    })
    .where(
      and(
        eq(
          workflowReferrals.referredStageInstanceId,
          input.referredStageInstanceId,
        ),
        eq(workflowReferrals.status, "ACTIVE"),
      ),
    )
    .returning({
      id: workflowReferrals.id,
      returnToReferrer: workflowReferrals.returnToReferrer,
      sourceStageInstanceId: workflowReferrals.sourceStageInstanceId,
      sourceTaskId: workflowReferrals.sourceTaskId,
      workflowInstanceId: workflowReferrals.workflowInstanceId,
    });
  if (!referral) return null;
  const returnTarget =
    referral.returnToReferrer === "YES"
      ? await loadWorkflowReferralReturn(
          transaction,
          input.referredStageInstanceId,
        )
      : null;
  if (returnTarget) {
    await routeWorkflowReferralReturn(transaction, returnTarget);
    await appendControlRecords(transaction, {
      action: "WORKFLOW_REFERRAL_RETURNED",
      actorId: input.actorId,
      after: {
        referredStageInstanceId: input.referredStageInstanceId,
        sourceStageInstanceId: referral.sourceStageInstanceId,
        sourceTaskId: referral.sourceTaskId,
      },
      correlationId: input.correlationId,
      stageInstanceId: referral.sourceStageInstanceId,
      targetId: referral.id,
      targetType: "WORKFLOW_REFERRAL",
      taskId: referral.sourceTaskId,
      workflowInstanceId: referral.workflowInstanceId,
    });
  }
  await appendControlRecords(transaction, {
    action: "WORKFLOW_REFERRAL_COMPLETED",
    actorId: input.actorId,
    after: {
      referredStageInstanceId: input.referredStageInstanceId,
      resolvedAt: resolvedAt.toISOString(),
      returnToReferrer: referral.returnToReferrer === "YES",
      routing: returnTarget ? "RETURNED_TO_REFERRER" : "CONTINUE_WORKFLOW",
    },
    correlationId: input.correlationId,
    stageInstanceId: referral.sourceStageInstanceId,
    targetId: referral.id,
    targetType: "WORKFLOW_REFERRAL",
    taskId: referral.sourceTaskId,
    workflowInstanceId: referral.workflowInstanceId,
  });
  return { ...referral, returnTarget };
}
