import "server-only";

import { sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import type { WorkQueueCursor } from "@/modules/work-queue/WorkQueueCursor";
import { eligibleSelfAssignment } from "./WorkflowPoolEligibility";

export type SelfAssignmentPoolItem = {
  dueAt: string | null;
  rowVersion: number;
  stageName: string;
  taskInstanceId: string;
  taskName: string;
};

export type SelfAssignmentPoolFilter = {
  limit: number;
  search?: string;
};

export async function readSelfAssignmentPool(
  actorId: string,
  input: SelfAssignmentPoolFilter,
  cursor?: WorkQueueCursor,
) {
  const search = input.search ? `%${input.search}%` : null;
  const result = await getDatabase().execute(sql`
    WITH eligible AS (
      SELECT task.id AS "taskInstanceId", task.row_version AS "rowVersion",
        task.due_at AS "dueAt", definition.name AS "taskName",
        stage_definition.name AS "stageName"
      FROM app_workflow_tasks task
      JOIN app_stage_task_definitions definition
        ON definition.id = task.workflow_task_definition_id
      JOIN app_workflow_stage_instances stage
        ON stage.id = task.stage_instance_id
      JOIN app_workflow_stage_definitions stage_definition
        ON stage_definition.id = stage.workflow_stage_definition_id
      JOIN app_workflow_instances workflow
        ON workflow.id = stage.workflow_instance_id
      JOIN app_applications application
        ON application.id = workflow.application_id
      WHERE ${eligibleSelfAssignment(actorId)}
        AND (${search}::text IS NULL OR definition.name ILIKE ${search})
    ), page AS (
      SELECT * FROM eligible
      WHERE ${cursor ? sql`(
        ("dueAt" > ${cursor.dueAt})
        OR ("dueAt" = ${cursor.dueAt}
          AND "taskInstanceId" > ${cursor.id}::uuid)
        OR (${cursor.dueAt}::timestamptz IS NOT NULL AND "dueAt" IS NULL)
        OR (${cursor.dueAt}::timestamptz IS NULL
          AND "dueAt" IS NULL AND "taskInstanceId" > ${cursor.id}::uuid)
      )` : sql`TRUE`}
      ORDER BY "dueAt" ASC NULLS LAST, "taskInstanceId" ASC
      LIMIT ${input.limit + 1}
    )
    SELECT (SELECT count(*)::integer FROM eligible) AS total,
      page."taskInstanceId", page."rowVersion", page."dueAt",
      page."taskName", page."stageName"
    FROM (SELECT 1) anchor
    LEFT JOIN page ON TRUE
    ORDER BY page."dueAt" ASC NULLS LAST, page."taskInstanceId" ASC
  `);
  const rows = result.rows as {
    total: number;
    taskInstanceId: string | null;
    rowVersion: number | null;
    dueAt: Date | string | null;
    taskName: string | null;
    stageName: string | null;
  }[];
  return {
    items: rows.filter((row) => row.taskInstanceId !== null).map((row) => ({
      dueAt: row.dueAt ? new Date(row.dueAt).toISOString() : null,
      rowVersion: row.rowVersion!,
      stageName: row.stageName!,
      taskInstanceId: row.taskInstanceId!,
      taskName: row.taskName!,
    })),
    total: rows[0]?.total ?? 0,
  };
}
