import "server-only";

import { and, eq, lte, sql } from "drizzle-orm";

import {
  fundingCalls,
  stageInstances,
  workflowDeferrals,
} from "@/db/schema";
import type { WorkflowActionExecutionTransaction } from "./WorkflowActionExecutionRepository";
import { appendControlRecords } from "./WorkflowControlRepository";

type Transaction = WorkflowActionExecutionTransaction;

export async function startWorkflowDeferral(
  transaction: Transaction,
  input: {
    actionExecutionId: string;
    actorId: string;
    comment?: string;
    continuation: "RESUME_ON_DATE" | "EXPLICIT_TRANSFER";
    correlationId: string;
    mode: "DATE" | "FUNDING_CALL";
    reasonCode?: string;
    resumeAt?: Date;
    stageInstanceId: string;
    targetCallKey?: string;
    taskId: string | null;
    workflowInstanceId: string;
  },
) {
  const targetCall = input.targetCallKey
    ? await transaction.select({ id: fundingCalls.id })
        .from(fundingCalls)
        .where(eq(fundingCalls.reference, input.targetCallKey))
        .limit(1)
    : [];
  if (input.targetCallKey && !targetCall[0]) return null;
  const [blocked] = await transaction.update(stageInstances).set({
    status: "BLOCKED",
  }).where(and(
    eq(stageInstances.id, input.stageInstanceId),
    eq(stageInstances.status, "ACTIVE"),
  )).returning({ id: stageInstances.id });
  if (!blocked) return null;
  const [deferral] = await transaction.insert(workflowDeferrals).values({
    actionExecutionId: input.actionExecutionId,
    comment: input.comment,
    continuation: input.continuation,
    deferredBy: input.actorId,
    mode: input.mode,
    previousStageStatus: "ACTIVE",
    reasonCode: input.reasonCode,
    resumeAt: input.resumeAt,
    stageInstanceId: input.stageInstanceId,
    targetFundingCallId: targetCall[0]?.id,
    taskId: input.taskId,
    workflowInstanceId: input.workflowInstanceId,
  }).returning({ id: workflowDeferrals.id });
  await appendControlRecords(transaction, {
    action: "WORKFLOW_DEFERRAL_STARTED",
    actorId: input.actorId,
    after: {
      continuation: input.continuation,
      mode: input.mode,
      resumeAt: input.resumeAt?.toISOString() ?? null,
      targetFundingCallId: targetCall[0]?.id ?? null,
    },
    correlationId: input.correlationId,
    stageInstanceId: input.stageInstanceId,
    targetId: deferral.id,
    targetType: "WORKFLOW_DEFERRAL",
    taskId: input.taskId,
    workflowInstanceId: input.workflowInstanceId,
  });
  return deferral;
}

export async function resumeDueWorkflowDeferral(
  transaction: Transaction,
  input: {
    actionExecutionId: string;
    actorId: string;
    correlationId: string;
    resumedAt: Date;
    stageInstanceId: string;
    taskId: string | null;
    workflowInstanceId: string;
  },
) {
  const [deferral] = await transaction.update(workflowDeferrals).set({
    resumeActionExecutionId: input.actionExecutionId,
    resumedAt: input.resumedAt,
    resumedBy: input.actorId,
    status: "RESUMED",
  }).where(and(
    eq(workflowDeferrals.stageInstanceId, input.stageInstanceId),
    eq(workflowDeferrals.status, "ACTIVE"),
    eq(workflowDeferrals.continuation, "RESUME_ON_DATE"),
    lte(workflowDeferrals.resumeAt, input.resumedAt),
  )).returning({
    deferredAt: workflowDeferrals.deferredAt,
    id: workflowDeferrals.id,
  });
  if (!deferral) return null;
  const [stage] = await transaction.update(stageInstances).set({
    status: "ACTIVE",
  }).where(and(
    eq(stageInstances.id, input.stageInstanceId),
    eq(stageInstances.status, "BLOCKED"),
    sql`NOT EXISTS (
      SELECT 1 FROM app_workflow_holds hold
      WHERE hold.stage_instance_id = ${input.stageInstanceId}::uuid
        AND hold.status = 'ACTIVE'
    )`,
  )).returning({ id: stageInstances.id });
  if (!stage) return null;
  await appendControlRecords(transaction, {
    action: "WORKFLOW_DEFERRAL_RESUMED",
    actorId: input.actorId,
    after: {
      durationMilliseconds:
        input.resumedAt.getTime() - deferral.deferredAt.getTime(),
      resumeActionExecutionId: input.actionExecutionId,
      resumedAt: input.resumedAt.toISOString(),
      status: "ACTIVE",
    },
    before: { status: "BLOCKED" },
    correlationId: input.correlationId,
    stageInstanceId: input.stageInstanceId,
    targetId: deferral.id,
    targetType: "WORKFLOW_DEFERRAL",
    taskId: input.taskId,
    workflowInstanceId: input.workflowInstanceId,
  });
  return deferral;
}
