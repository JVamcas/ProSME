import "server-only";

import { and, eq } from "drizzle-orm";

import {
  stageInstances,
  workflowAuditEntries,
  workflowEvents,
  workflowHolds,
  workflowReferrals,
  workflowReworks,
} from "@/db/schema";
import type { WorkflowActionExecutionTransaction } from "./WorkflowActionExecutionRepository";

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
  const [rework] = await transaction.insert(workflowReworks).values({
    actionExecutionId: input.actionExecutionId,
    continuationStageInstanceId: input.continuationStageInstanceId,
    createdBy: input.actorId,
    dataHandling: input.dataHandling,
    reason: input.reason,
    sourceStageInstanceId: input.sourceStageInstanceId,
    sourceTaskId: input.sourceTaskId,
    targetStageInstanceId: input.targetStageInstanceId,
    workflowInstanceId: input.workflowInstanceId,
  }).returning({ id: workflowReworks.id });
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
    .where(and(
      eq(workflowReferrals.sourceTaskId, sourceTaskId),
      eq(workflowReferrals.status, "ACTIVE"),
    ))
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
  const [referral] = await transaction.insert(workflowReferrals).values({
    actionExecutionId: input.actionExecutionId,
    question: input.question,
    referredBy: input.actorId,
    referredStageInstanceId: input.referredStageInstanceId,
    returnToReferrer: input.returnToReferrer ? "YES" : "NO",
    sourceStageInstanceId: input.sourceStageInstanceId,
    sourceTaskBehavior: input.sourceTaskBehavior,
    sourceTaskId: input.sourceTaskId,
    workflowInstanceId: input.workflowInstanceId,
  }).returning({ id: workflowReferrals.id });
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
  const [referral] = await transaction.update(workflowReferrals).set({
    resolvedAt,
    resolvedBy: input.actorId,
    status: "COMPLETED",
  }).where(and(
    eq(workflowReferrals.referredStageInstanceId, input.referredStageInstanceId),
    eq(workflowReferrals.status, "ACTIVE"),
  )).returning({
    id: workflowReferrals.id,
    sourceStageInstanceId: workflowReferrals.sourceStageInstanceId,
    sourceTaskId: workflowReferrals.sourceTaskId,
    workflowInstanceId: workflowReferrals.workflowInstanceId,
  });
  if (!referral) return null;
  await appendControlRecords(transaction, {
    action: "WORKFLOW_REFERRAL_COMPLETED",
    actorId: input.actorId,
    after: {
      referredStageInstanceId: input.referredStageInstanceId,
      resolvedAt: resolvedAt.toISOString(),
    },
    correlationId: input.correlationId,
    stageInstanceId: referral.sourceStageInstanceId,
    targetId: referral.id,
    targetType: "WORKFLOW_REFERRAL",
    taskId: referral.sourceTaskId,
    workflowInstanceId: referral.workflowInstanceId,
  });
  return referral;
}

export async function startWorkflowHold(
  transaction: ControlTransaction,
  input: {
    actionExecutionId: string;
    actorId: string;
    comment?: string;
    correlationId: string;
    reason?: string;
    reviewAt?: Date;
    stageInstanceId: string;
    taskId: string | null;
    workflowInstanceId: string;
  },
) {
  const [blocked] = await transaction.update(stageInstances).set({
    status: "BLOCKED",
  }).where(and(
    eq(stageInstances.id, input.stageInstanceId),
    eq(stageInstances.status, "ACTIVE"),
  )).returning({ id: stageInstances.id });
  if (!blocked) return null;
  const [hold] = await transaction.insert(workflowHolds).values({
    actionExecutionId: input.actionExecutionId,
    comment: input.comment,
    heldBy: input.actorId,
    previousStageStatus: "ACTIVE",
    reason: input.reason,
    reviewAt: input.reviewAt,
    stageInstanceId: input.stageInstanceId,
    taskId: input.taskId,
    workflowInstanceId: input.workflowInstanceId,
  }).returning({ id: workflowHolds.id, heldAt: workflowHolds.heldAt });
  await appendControlRecords(transaction, {
    action: "WORKFLOW_HOLD_STARTED",
    actorId: input.actorId,
    after: {
      heldAt: hold.heldAt.toISOString(),
      reviewAt: input.reviewAt?.toISOString() ?? null,
      scope: "STAGE",
      status: "BLOCKED",
    },
    before: { status: "ACTIVE" },
    correlationId: input.correlationId,
    stageInstanceId: input.stageInstanceId,
    targetId: hold.id,
    targetType: "WORKFLOW_HOLD",
    taskId: input.taskId,
    workflowInstanceId: input.workflowInstanceId,
  });
  return hold;
}

export async function resumeWorkflowHold(
  transaction: ControlTransaction,
  input: {
    actorId: string;
    comment?: string;
    correlationId: string;
    stageInstanceId: string;
    taskId: string | null;
    workflowInstanceId: string;
  },
) {
  const resumedAt = new Date();
  const [hold] = await transaction.update(workflowHolds).set({
    resumedAt,
    resumedBy: input.actorId,
    status: "RESUMED",
  }).where(and(
    eq(workflowHolds.stageInstanceId, input.stageInstanceId),
    eq(workflowHolds.status, "ACTIVE"),
  )).returning({ id: workflowHolds.id, heldAt: workflowHolds.heldAt });
  if (!hold) return null;
  const [stage] = await transaction.update(stageInstances).set({
    status: "ACTIVE",
  }).where(and(
    eq(stageInstances.id, input.stageInstanceId),
    eq(stageInstances.status, "BLOCKED"),
  )).returning({ id: stageInstances.id });
  if (!stage) return null;
  await appendControlRecords(transaction, {
    action: "WORKFLOW_HOLD_ENDED",
    actorId: input.actorId,
    after: {
      durationMilliseconds: resumedAt.getTime() - hold.heldAt.getTime(),
      resumedAt: resumedAt.toISOString(),
      status: "ACTIVE",
    },
    before: { status: "BLOCKED" },
    correlationId: input.correlationId,
    stageInstanceId: input.stageInstanceId,
    targetId: hold.id,
    targetType: "WORKFLOW_HOLD",
    taskId: input.taskId,
    workflowInstanceId: input.workflowInstanceId,
  });
  return hold;
}
