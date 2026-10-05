import "server-only";
import {
  workflowTaskHasActiveHold,
  workflowTaskHoldSummaries,
} from "./WorkflowHoldQueries";

import { sql } from "drizzle-orm";

import { canCancelOwnEscalation } from "./WorkflowEscalationTrackingSql";
import { getDatabase } from "@/db/client";
import type {
  WorkQueueListInput,
  WorkQueueRow,
} from "@/modules/work-queue/WorkQueueTypes";
import type { WorkQueueCursor } from "@/modules/work-queue/WorkQueueCursor";
import { workflowTaskEffectiveDeadline } from "./WorkflowSlaDeadline";
import { workflowTaskPrerequisitesSatisfied } from "./WorkflowTaskPrerequisiteReadiness";

const actionableStatuses = sql`('PENDING', 'IN_PROGRESS')`;

type QueueDatabaseRow = Omit<
  WorkQueueRow,
  "claimedAt" | "createdAt" | "dueAt"
> & {
  claimedAt: Date | string | null;
  createdAt: Date | string | null;
  dueAt: Date | string | null;
  totalCount: number;
};

function scopeFilter(scope: WorkQueueListInput["scope"]) {
  const running = sql`stage.status = 'ACTIVE' AND NOT ${workflowTaskHasActiveHold(sql`task`)} AND NOT EXISTS (
    SELECT 1 FROM app_workflow_rfis rfi WHERE rfi.task_id = task.id AND rfi.status = 'OPEN'
  )`;
  if (scope === "overdue") {
    return sql`${running} AND deadline.effective_due_at < CURRENT_TIMESTAMP`;
  }
  if (scope === "due-soon") {
    return sql`${running} AND deadline.effective_due_at >= CURRENT_TIMESTAMP
      AND deadline.effective_due_at <= CURRENT_TIMESTAMP + INTERVAL '48 hours'`;
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

function routedToActor(actorId: string) {
  return sql`(
    task.assigned_user_id = ${actorId}::uuid
  )`;
}

function visibleToActor(actorId: string) {
  return sql`(${routedToActor(actorId)} OR outgoing.id IS NOT NULL)`;
}

function queueQuery(
  input: WorkQueueListInput,
  actorId: string,
  cursor?: WorkQueueCursor,
) {
  return sql`
    WITH filtered AS (
      SELECT
        task.id AS "taskInstanceId",
        definition.code AS "taskDefinitionCode",
        definition.name AS "taskName",
        CASE WHEN ${visibleToActor(actorId)}
          AND app_workflow_task_coi_cleared(task.id, ${actorId}::uuid)
          THEN application.id ELSE NULL END AS "applicationId",
        CASE WHEN ${visibleToActor(actorId)}
          AND app_workflow_task_coi_cleared(task.id, ${actorId}::uuid)
          THEN application.reference ELSE coi_gate.blocked_reason END AS "reference",
        CASE WHEN ${visibleToActor(actorId)}
          AND app_workflow_task_coi_cleared(task.id, ${actorId}::uuid)
          THEN NULLIF(COALESCE(business.trading_name, business.legal_name), '')
          ELSE NULL END AS "businessName",
        CASE WHEN ${visibleToActor(actorId)}
          AND app_workflow_task_coi_cleared(task.id, ${actorId}::uuid)
          THEN applicant.display_name ELSE coi_gate.blocked_reason END AS "applicantName",
        coi_gate.blocked_reason AS "coiBlockedReason",
        CASE WHEN ${visibleToActor(actorId)}
          AND app_workflow_task_coi_cleared(task.id, ${actorId}::uuid)
          THEN application.funding_opportunity_title
          ELSE NULL END AS "fundingCallTitle",
        stage_definition.name AS "stageName",
        CASE WHEN app_workflow_task_coi_cleared(task.id, ${actorId}::uuid)
          AND request.id IS NOT NULL THEN jsonb_build_object(
            'id', request.id, 'status', request.status,
            'createdAt', request.created_at, 'deadlineAt', request.deadline_at,
            'respondedAt', request.responded_at
          ) ELSE NULL END AS "informationRequest",
        CASE WHEN ${workflowTaskHasActiveHold(sql`task`)} THEN 'On hold. Open the task to review or resume it.'
          WHEN stage.status = 'BLOCKED' AND EXISTS (
            SELECT 1 FROM app_workflow_deferrals deferral
            WHERE deferral.stage_instance_id = stage.id
              AND deferral.status = 'ACTIVE'
          ) THEN 'Deferred. Open the task to review its continuation.'
          WHEN NOT ${workflowTaskPrerequisitesSatisfied(sql`task`, sql`definition`)}
            THEN 'Meet the required contributing review thresholds before making the stage decision.'
          WHEN app_workflow_task_coi_cleared(task.id, ${actorId}::uuid)
            AND request.status = 'OPEN'
            THEN 'Close the open information request before completing this task.'
          ELSE NULL END AS "taskBlockedReason",
        CASE WHEN ${workflowTaskHasActiveHold(sql`task`)} THEN 'ON_HOLD' ELSE NULL END AS "processingStatus",
        CASE WHEN app_workflow_task_coi_cleared(task.id, ${actorId}::uuid)
          THEN ${workflowTaskHoldSummaries(sql`task`)} ELSE '[]'::jsonb END AS holds,
        NULL::text AS "priority",
        CASE WHEN outgoing.id IS NOT NULL THEN 'ESCALATED'
          ELSE task.status END AS "taskStatus",
        CASE WHEN outgoing.id IS NOT NULL THEN jsonb_build_object(
          'id', outgoing.id,
          'canCancel', ${canCancelOwnEscalation(actorId, sql`task`, sql`outgoing`)}
        ) ELSE NULL END AS "outgoingEscalation",
        definition.task_type AS "taskType",
        task.assigned_role_id AS "assignedRoleId",
        role.name AS "assignedRoleName",
        task.assigned_user_id AS "assignedUserId",
        assignee.display_name AS "assignedUserName",
        deadline.effective_due_at AS "dueAt",
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
      LEFT JOIN LATERAL (
        SELECT escalation.id, escalation.escalated_at
        FROM app_workflow_escalations escalation
        WHERE escalation.task_id = task.id
          AND escalation.status = 'ACTIVE' AND escalation.trigger = 'MANUAL'
          AND escalation.source_assigned_user_id = ${actorId}::uuid
          AND escalation.escalated_by = ${actorId}::uuid
          AND task.assigned_user_id IS DISTINCT FROM ${actorId}::uuid
        ORDER BY escalation.escalated_at DESC, escalation.id DESC LIMIT 1
      ) outgoing ON TRUE
      LEFT JOIN app_roles role ON role.id = task.assigned_role_id
      LEFT JOIN app_users assignee ON assignee.id = task.assigned_user_id
      LEFT JOIN app_workflow_application_coi clearance
        ON clearance.application_id = workflow.application_id
          AND clearance.user_id = ${actorId}::uuid
          AND clearance.form_version_id = stage_definition.coi_form_version_id
      CROSS JOIN LATERAL (
        SELECT CASE
          WHEN app_workflow_task_coi_cleared(task.id, ${actorId}::uuid) THEN NULL
          WHEN clearance.state = 'PENDING_REVIEW'
            THEN 'COI disclosure awaiting independent review'
          WHEN clearance.state = 'RECUSED' THEN 'Recused from this application'
          WHEN clearance.state = 'REVOKED' THEN 'COI clearance revoked'
          ELSE 'COI declaration required'
        END AS blocked_reason
      ) coi_gate
      LEFT JOIN LATERAL (
        SELECT rfi.id, rfi.status, rfi.created_at, rfi.deadline_at, rfi.responded_at
        FROM app_workflow_rfis rfi
        WHERE rfi.task_id = task.id
        ORDER BY CASE WHEN rfi.status = 'OPEN' THEN 0
          WHEN rfi.status = 'RESPONDED' THEN 1 ELSE 2 END,
          rfi.created_at DESC, rfi.id DESC
        LIMIT 1
      ) request ON TRUE
      CROSS JOIN LATERAL (
        SELECT date_trunc('milliseconds', ${workflowTaskEffectiveDeadline(sql`task`)}) AS effective_due_at
      ) deadline
      WHERE workflow.status = 'ACTIVE'
        AND stage.status IN ('ACTIVE', 'BLOCKED')
        AND task.status IN ${actionableStatuses}
        AND ${visibleToActor(actorId)}
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
    informationRequest: row.informationRequest
      ? {
          ...row.informationRequest,
          createdAt: new Date(row.informationRequest.createdAt).toISOString(),
          deadlineAt: new Date(row.informationRequest.deadlineAt).toISOString(),
          respondedAt: row.informationRequest.respondedAt
            ? new Date(row.informationRequest.respondedAt).toISOString()
            : null,
        }
      : null,
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
  const result = await getDatabase().execute(
    queueQuery(input, actorId, cursor),
  );
  const rows = result.rows as unknown as QueueDatabaseRow[];
  return {
    items: rows.filter((row) => row.taskInstanceId !== null).map(toQueueRow),
    total: rows[0]?.totalCount ?? 0,
  };
}
