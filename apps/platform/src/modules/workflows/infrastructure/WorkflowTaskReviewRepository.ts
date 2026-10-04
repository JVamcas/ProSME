import "server-only";
import { lockWorkflowRuntimeForTask } from "./WorkflowRuntimeLock";

import { workflowTaskControlAllowsCompletion } from "./WorkflowTaskControlReadiness";
import { sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import type { SaveTaskReviewDraftInput } from "@/modules/work-queue/TaskTypes";

type ReviewResult = Record<string, unknown>;

function resultRecord(result: unknown): ReviewResult {
  return result !== null && typeof result === "object" && !Array.isArray(result)
    ? { ...result as ReviewResult }
    : {};
}

function mergeItems<T extends Record<string, unknown>>(
  current: unknown,
  patch: T[],
  key: keyof T,
) {
  const merged = new Map<unknown, T>();
  if (Array.isArray(current)) {
    current.forEach((item) => {
      if (item !== null && typeof item === "object" && key in item) {
        merged.set((item as T)[key], item as T);
      }
    });
  }
  patch.forEach((item) => merged.set(item[key], item));
  return [...merged.values()];
}

export function mergeTaskReviewDraft(
  result: unknown,
  patch: SaveTaskReviewDraftInput,
) {
  const next = resultRecord(result);
  if (patch.comments) {
    next.comments = mergeItems(next.comments, patch.comments, "key");
  }
  if (patch.documents) {
    next.documents = mergeItems(next.documents, patch.documents, "category");
  }
  if (patch.items) {
    next.items = mergeItems(next.items, patch.items, "code");
  }
  if (patch.scores) {
    next.scores = mergeItems(next.scores, patch.scores, "criterion");
  }
  return next;
}

export async function writeTaskReviewDraft(input: SaveTaskReviewDraftInput & {
  actorId: string;
  correlationId: string;
  taskId: string;
}) {
  return getDatabase().transaction(async (transaction) => {
    await lockWorkflowRuntimeForTask(transaction, input.taskId);
    const locked = await transaction.execute(sql`
      SELECT task.result, task.stage_instance_id AS "stageInstanceId",
        stage.workflow_instance_id AS "workflowInstanceId"
      FROM app_workflow_tasks task
      JOIN app_workflow_stage_instances stage ON stage.id = task.stage_instance_id
      JOIN app_workflow_instances workflow ON workflow.id = stage.workflow_instance_id
      WHERE task.id = ${input.taskId}::uuid
        AND task.assigned_user_id = ${input.actorId}::uuid
        AND app_workflow_task_coi_cleared(task.id, ${input.actorId}::uuid)
        AND task.status IN ('PENDING', 'IN_PROGRESS')
        AND stage.status = 'ACTIVE'
        AND ${workflowTaskControlAllowsCompletion}
        AND workflow.status = 'ACTIVE'
      FOR UPDATE OF task
    `);
    const task = locked.rows[0] as {
      result: unknown;
      stageInstanceId: string;
      workflowInstanceId: string;
    } | undefined;
    if (!task) return false;

    const patch = {
      ...(input.comments ? { comments: input.comments } : {}),
      ...(input.documents ? { documents: input.documents } : {}),
      ...(input.items ? { items: input.items } : {}),
      ...(input.scores ? { scores: input.scores } : {}),
    };
    const nextResult = mergeTaskReviewDraft(task.result, patch);
    await transaction.execute(sql`
      UPDATE app_workflow_tasks
      SET result = ${JSON.stringify(nextResult)}::jsonb,
        status = 'IN_PROGRESS',
        started_at = COALESCE(started_at, NOW())
      WHERE id = ${input.taskId}::uuid
    `);
    await transaction.execute(sql`
      INSERT INTO app_workflow_audit_entries
        (actor_id, action, target_type, target_id, correlation_id,
         workflow_instance_id, stage_instance_id, task_id, before, after)
      VALUES (${input.actorId}::uuid, 'TASK_REVIEW_DRAFT_SAVED',
        'WORKFLOW_TASK', ${input.taskId}, ${input.correlationId}::uuid,
        ${task.workflowInstanceId}::uuid, ${task.stageInstanceId}::uuid,
        ${input.taskId}::uuid, ${JSON.stringify(task.result)}::jsonb,
        ${JSON.stringify(nextResult)}::jsonb)
    `);
    return true;
  });
}
