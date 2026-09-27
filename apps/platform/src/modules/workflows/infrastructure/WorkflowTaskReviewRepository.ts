import "server-only";

import { sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import type { SaveTaskReviewDraftInput } from "@/modules/work-queue/TaskTypes";

export async function writeTaskReviewDraft(input: SaveTaskReviewDraftInput & {
  actorId: string;
  correlationId: string;
  taskId: string;
}) {
  return getDatabase().transaction(async (transaction) => {
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
        AND workflow.status = 'ACTIVE'
      FOR UPDATE OF task
    `);
    const task = locked.rows[0] as {
      result: unknown;
      stageInstanceId: string;
      workflowInstanceId: string;
    } | undefined;
    if (!task) return false;

    const review = {
      comments: input.comments ?? [],
      documents: input.documents ?? [],
      items: input.items,
      scores: input.scores ?? [],
    };
    await transaction.execute(sql`
      UPDATE app_workflow_tasks
      SET result = COALESCE(result, '{}'::jsonb) || ${JSON.stringify(review)}::jsonb,
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
        ${JSON.stringify(review)}::jsonb)
    `);
    return true;
  });
}
