import "server-only";

import { sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";

export type AssignmentHistoryEntry = {
  action: string;
  actorId: string;
  assignedUserId: string | null;
  occurredAt: string;
  previousUserId: string | null;
  reason: string | null;
  reviewerSlot: number;
  sequence: number;
  status: string | null;
  taskId: string;
};

export async function readAssignmentHistory(
  taskId: string,
  input: { after?: number; limit: number },
) {
  const result = await getDatabase().execute(sql`
    WITH target AS (
      SELECT stage_instance_id, workflow_task_definition_id, reviewer_slot
      FROM app_workflow_tasks
      WHERE id = ${taskId}::uuid
    ), slot_tasks AS (
      SELECT task.id, task.reviewer_slot AS "reviewerSlot"
      FROM app_workflow_tasks task
      JOIN target ON target.stage_instance_id = task.stage_instance_id
        AND target.workflow_task_definition_id = task.workflow_task_definition_id
        AND target.reviewer_slot = task.reviewer_slot
    ), history AS (
      SELECT audit.runtime_sequence AS sequence,
        audit.task_id AS "taskId", slot_tasks."reviewerSlot",
        audit.action, audit.actor_id AS "actorId",
        audit.before ->> 'assignedUserId' AS "previousUserId",
        COALESCE(audit.after ->> 'assignedUserId',
          audit.after ->> 'replacementUserId') AS "assignedUserId",
        audit.after ->> 'status' AS status,
        audit.reason, audit.created_at AS "occurredAt"
      FROM app_workflow_audit_entries audit
      JOIN slot_tasks ON slot_tasks.id = audit.task_id
      WHERE audit.action IN (
        'TASK_CREATED', 'TASK_ASSIGNED', 'TASK_CLAIMED', 'TASK_STARTED',
        'TASK_IN_PROGRESS', 'TASK_RELEASED', 'TASK_REPLACED',
        'TASK_COMPLETED', 'TASK_CANCELLED'
      )
    ), page AS (
      SELECT * FROM history
      WHERE ${input.after ? sql`sequence > ${input.after}` : sql`TRUE`}
      ORDER BY sequence ASC
      LIMIT ${input.limit + 1}
    )
    SELECT (SELECT count(*)::integer FROM history) AS total,
      page.sequence, page."taskId", page."reviewerSlot", page.action,
      page."actorId", page."previousUserId", page."assignedUserId",
      page.status, page.reason, page."occurredAt"
    FROM (SELECT 1) anchor
    LEFT JOIN page ON TRUE
    ORDER BY page.sequence ASC
  `);
  const rows = result.rows as {
    total: number;
    sequence: string | number | null;
    taskId: string | null;
    reviewerSlot: number | null;
    action: string | null;
    actorId: string | null;
    previousUserId: string | null;
    assignedUserId: string | null;
    status: string | null;
    reason: string | null;
    occurredAt: Date | string | null;
  }[];
  return {
    items: rows.filter((row) => row.sequence !== null).map((row) => ({
      action: row.action!,
      actorId: row.actorId!,
      assignedUserId: row.assignedUserId,
      occurredAt: new Date(row.occurredAt!).toISOString(),
      previousUserId: row.previousUserId,
      reason: row.reason,
      reviewerSlot: row.reviewerSlot!,
      sequence: Number(row.sequence),
      status: row.status,
      taskId: row.taskId!,
    })),
    total: rows[0]?.total ?? 0,
  };
}
