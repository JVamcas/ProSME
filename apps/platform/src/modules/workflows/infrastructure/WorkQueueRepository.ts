import "server-only";

import { sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import type { WorkQueueListInput, WorkQueueRow } from "@/modules/work-queue/WorkQueueTypes";
import type { WorkQueueCursor } from "@/modules/work-queue/WorkQueueCursor";

const actionableStatuses = sql`('PENDING', 'CLAIMED', 'IN_PROGRESS')`;

type QueueDatabaseRow = Omit<WorkQueueRow, "claimedAt" | "createdAt" | "dueAt"> & {
  claimedAt: Date | string | null;
  createdAt: Date | string | null;
  dueAt: Date | string | null;
  totalCount: number;
};

function scopeFilter(scope: WorkQueueListInput["scope"]) {
  if (scope === "overdue") return sql`task.due_at < CURRENT_TIMESTAMP`;
  if (scope === "due-soon") {
    return sql`task.due_at >= CURRENT_TIMESTAMP
      AND task.due_at <= CURRENT_TIMESTAMP + INTERVAL '48 hours'`;
  }
  return sql`TRUE`;
}

function searchFilter(actorId: string, search?: string) {
  if (!search) return sql`TRUE`;
  const pattern = `%${search}%`;
  return sql`(
    definition.name ILIKE ${pattern}
    OR (app_workflow_task_coi_cleared(task.id, ${actorId}::uuid)
      AND (
        application.reference ILIKE ${pattern}
        OR applicant.display_name ILIKE ${pattern}
        OR business.legal_name ILIKE ${pattern}
        OR business.trading_name ILIKE ${pattern}
      ))
  )`;
}

function cursorFilter(cursor?: WorkQueueCursor) {
  if (!cursor) return sql`TRUE`;
  if (!cursor.dueAt) {
    return sql`"dueAt" IS NULL AND "taskInstanceId" > ${cursor.id}::uuid`;
  }
  return sql`(
    "dueAt" > ${cursor.dueAt}
    OR ("dueAt" = ${cursor.dueAt} AND "taskInstanceId" > ${cursor.id}::uuid)
    OR "dueAt" IS NULL
  )`;
}

function queueQuery(input: WorkQueueListInput, actorId: string, cursor?: WorkQueueCursor) {
  return sql`
    WITH filtered AS (
      SELECT
        task.id AS "taskInstanceId",
        definition.code AS "taskDefinitionCode",
        definition.name AS "taskName",
        CASE WHEN task.assigned_user_id = ${actorId}::uuid
          AND app_workflow_task_coi_cleared(task.id, ${actorId}::uuid)
          THEN application.id ELSE NULL END AS "applicationId",
        CASE WHEN task.assigned_user_id = ${actorId}::uuid
          AND app_workflow_task_coi_cleared(task.id, ${actorId}::uuid)
          THEN application.reference ELSE 'COI clearance required' END AS "reference",
        CASE WHEN task.assigned_user_id = ${actorId}::uuid
          AND app_workflow_task_coi_cleared(task.id, ${actorId}::uuid)
          THEN NULLIF(COALESCE(business.trading_name, business.legal_name), '')
          ELSE NULL END AS "businessName",
        CASE WHEN task.assigned_user_id = ${actorId}::uuid
          AND app_workflow_task_coi_cleared(task.id, ${actorId}::uuid)
          THEN applicant.display_name ELSE 'COI clearance required' END AS "applicantName",
        stage_definition.name AS "stageName",
        NULL::text AS "priority",
        task.status AS "taskStatus",
        task.assigned_role_id AS "assignedRoleId",
        role.name AS "assignedRoleName",
        task.assigned_user_id AS "assignedUserId",
        assignee.display_name AS "assignedUserName",
        task.due_at AS "dueAt",
        task.claimed_at AS "claimedAt",
        task.created_at AS "createdAt",
        task.row_version AS "rowVersion"
      FROM app_workflow_tasks task
      JOIN app_stage_task_definitions definition ON definition.id = task.workflow_task_definition_id
      JOIN app_workflow_stage_instances stage ON stage.id = task.stage_instance_id
      JOIN app_workflow_stage_definitions stage_definition ON stage_definition.id = stage.workflow_stage_definition_id
      JOIN app_workflow_instances workflow ON workflow.id = stage.workflow_instance_id
      JOIN app_applications application ON application.id = workflow.application_id
      JOIN app_users applicant ON applicant.id = application.owner_user_id
      LEFT JOIN app_business_profiles business
        ON business.id::text = application.business_section ->> 'businessId'
      LEFT JOIN app_roles role ON role.id = task.assigned_role_id
      LEFT JOIN app_users assignee ON assignee.id = task.assigned_user_id
      WHERE workflow.status = 'ACTIVE'
        AND stage.status IN ('ACTIVE', 'BLOCKED')
        AND task.status IN ${actionableStatuses}
        AND task.assigned_user_id = ${actorId}::uuid
        AND ${scopeFilter(input.scope)}
        AND ${searchFilter(actorId, input.search)}
    )
    SELECT page.*, totals."totalCount"
    FROM (SELECT count(*)::integer AS "totalCount" FROM filtered) totals
    LEFT JOIN LATERAL (
      SELECT * FROM filtered
      WHERE ${cursorFilter(cursor)}
      ORDER BY "dueAt" ASC NULLS LAST, "taskInstanceId" ASC
      LIMIT ${input.limit + 1}
    ) page ON TRUE
    ORDER BY page."dueAt" ASC NULLS LAST, page."taskInstanceId" ASC
  `;
}

function toQueueRow(row: QueueDatabaseRow): WorkQueueRow {
  return {
    ...row,
    claimedAt: row.claimedAt ? new Date(row.claimedAt).toISOString() : null,
    createdAt: new Date(row.createdAt!).toISOString(),
    dueAt: row.dueAt ? new Date(row.dueAt).toISOString() : null,
  };
}

export async function readWorkQueue(
  actorId: string,
  input: WorkQueueListInput,
  cursor?: WorkQueueCursor,
) {
  const result = await getDatabase().execute(queueQuery(input, actorId, cursor));
  const rows = result.rows as unknown as QueueDatabaseRow[];
  return {
    items: rows.filter((row) => row.taskInstanceId !== null).map(toQueueRow),
    total: rows[0]?.totalCount ?? 0,
  };
}
