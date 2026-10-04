import "server-only";

import { and, eq, sql } from "drizzle-orm";
import type {
  WorkflowHoldScope,
  WorkflowHoldSummary,
} from "../domain/runtime/WorkflowHold";
import type { WorkflowActionExecutionTransaction } from "./WorkflowActionExecutionRepository";
import { workflowHolds } from "./workflow-control.schema";
import { stageInstances } from "./workflow-runtime.schema";
import { appendControlRecords } from "./WorkflowControlRepository";

type Executor = Pick<WorkflowActionExecutionTransaction, "execute">;

export type ActiveWorkflowHold = WorkflowHoldSummary & {
  taskId: string | null;
  stageInstanceId: string;
  workflowInstanceId: string;
};

export async function readApplicableWorkflowHolds(
  executor: Executor,
  input: {
    workflowInstanceId: string;
    stageInstanceId: string;
    taskId?: string | null;
  },
) {
  const result = await executor.execute<ActiveWorkflowHold>(sql`
    SELECT hold.id, hold.scope, hold.task_id AS "taskId",
      hold.stage_instance_id AS "stageInstanceId",
      hold.workflow_instance_id AS "workflowInstanceId",
      hold.held_at::text AS "heldAt", holder.display_name AS "heldBy",
      hold.reason, hold.review_at::text AS "reviewAt"
    FROM app_workflow_holds hold
    JOIN app_users holder ON holder.id = hold.held_by
    WHERE hold.workflow_instance_id = ${input.workflowInstanceId}::uuid
      AND hold.status = 'ACTIVE'
      AND (hold.scope = 'APPLICATION'
        OR (hold.scope = 'STAGE' AND hold.stage_instance_id = ${input.stageInstanceId}::uuid)
        OR (hold.scope = 'TASK' AND hold.task_id = ${input.taskId ?? null}::uuid))
    ORDER BY hold.held_at, hold.id
  `);
  return result.rows;
}

export async function startWorkflowHold(
  transaction: WorkflowActionExecutionTransaction,
  input: {
    actionExecutionId: string;
    actorId: string;
    comment?: string;
    correlationId: string;
    reason?: string;
    reviewAt?: Date;
    scope: WorkflowHoldScope;
    stageInstanceId: string;
    taskId: string | null;
    workflowInstanceId: string;
  },
) {
  // Holds are a processing overlay. Progress and public status stay intact.
  const [hold] = await transaction
    .insert(workflowHolds)
    .values({
      actionExecutionId: input.actionExecutionId,
      comment: input.comment,
      heldBy: input.actorId,
      previousStageStatus: "ACTIVE",
      reason: input.reason,
      reviewAt: input.reviewAt,
      scope: input.scope,
      stageInstanceId: input.stageInstanceId,
      taskId: input.taskId,
      workflowInstanceId: input.workflowInstanceId,
    })
    .onConflictDoNothing()
    .returning({ id: workflowHolds.id, heldAt: workflowHolds.heldAt });
  if (!hold) return null;
  await appendControlRecords(transaction, {
    action: "WORKFLOW_HOLD_STARTED",
    actorId: input.actorId,
    after: {
      heldAt: hold.heldAt.toISOString(),
      reviewAt: input.reviewAt?.toISOString() ?? null,
      scope: input.scope,
      reason: input.reason ?? null,
      status: "ON_HOLD",
    },
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
  transaction: WorkflowActionExecutionTransaction,
  input: {
    actorId: string;
    actorType?: "USER" | "SYSTEM";
    correlationId: string;
    holdId: string;
    resumedAt: Date;
    workflowInstanceId: string;
  },
) {
  const [hold] = await transaction
    .update(workflowHolds)
    .set({
      resumedAt: input.resumedAt,
      resumedBy: input.actorId,
      status: "RESUMED",
    })
    .where(
      and(
        eq(workflowHolds.id, input.holdId),
        eq(workflowHolds.workflowInstanceId, input.workflowInstanceId),
        eq(workflowHolds.status, "ACTIVE"),
      ),
    )
    .returning({
      id: workflowHolds.id,
      scope: workflowHolds.scope,
      heldAt: workflowHolds.heldAt,
      heldBy: workflowHolds.heldBy,
      stageInstanceId: workflowHolds.stageInstanceId,
      taskId: workflowHolds.taskId,
    });
  if (!hold) return null;
  // Compatibility for holds created before scope support. Never release a
  // deferral or another stage/application hold when ending this hold.
  await transaction
    .update(stageInstances)
    .set({ status: "ACTIVE" })
    .where(
      and(
        eq(stageInstances.id, hold.stageInstanceId),
        eq(stageInstances.status, "BLOCKED"),
        sql`NOT EXISTS (SELECT 1 FROM app_workflow_deferrals deferral
      WHERE deferral.stage_instance_id = ${stageInstances.id} AND deferral.status = 'ACTIVE')`,
        sql`NOT EXISTS (SELECT 1 FROM app_workflow_holds remaining
      WHERE remaining.status = 'ACTIVE'
        AND (remaining.scope = 'APPLICATION' AND remaining.workflow_instance_id = ${stageInstances.workflowInstanceId}
          OR remaining.scope = 'STAGE' AND remaining.stage_instance_id = ${stageInstances.id}))`,
      ),
    );
  await appendControlRecords(transaction, {
    action: "WORKFLOW_HOLD_ENDED",
    actorId: input.actorId,
    after: {
      actorType: input.actorType ?? "USER",
      durationMilliseconds: input.resumedAt.getTime() - hold.heldAt.getTime(),
      resumedAt: input.resumedAt.toISOString(),
      scope: hold.scope,
      status: "RESUMED",
    },
    before: { status: "ACTIVE" },
    correlationId: input.correlationId,
    stageInstanceId: hold.stageInstanceId,
    targetId: hold.id,
    targetType: "WORKFLOW_HOLD",
    taskId: hold.taskId,
    workflowInstanceId: input.workflowInstanceId,
  });
  return hold;
}
