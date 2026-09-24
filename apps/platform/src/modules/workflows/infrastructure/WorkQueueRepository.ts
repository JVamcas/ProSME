import "server-only";

import { sql, type SQL } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import type { TaskClaimResult, WorkQueueListInput, WorkQueueRow } from "@/modules/work-queue/WorkQueueTypes";
import type { WorkQueueCursor } from "@/modules/work-queue/WorkQueueCursor";
import { eligibleSelfAssignment } from "./WorkflowPoolEligibility";

const actionableStatuses = sql`('PENDING', 'CLAIMED', 'IN_PROGRESS')`;

type QueueDatabaseRow = Omit<WorkQueueRow, "claimedAt" | "dueAt"> & {
  claimedAt: Date | string | null;
  dueAt: Date | string | null;
  totalCount: number;
};

function actorScope(actorId: string) {
  return sql`(
    task.assigned_user_id = ${actorId}::uuid
    OR ${eligibleSelfAssignment(actorId)}
  )`;
}

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
    OR (task.assigned_user_id = ${actorId}::uuid
      AND app_workflow_task_coi_cleared(task.id, ${actorId}::uuid)
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
          THEN application.reference ELSE 'Claim or COI clearance required' END AS "reference",
        CASE WHEN task.assigned_user_id = ${actorId}::uuid
          AND app_workflow_task_coi_cleared(task.id, ${actorId}::uuid)
          THEN NULLIF(COALESCE(business.trading_name, business.legal_name), '')
          ELSE NULL END AS "businessName",
        CASE WHEN task.assigned_user_id = ${actorId}::uuid
          AND app_workflow_task_coi_cleared(task.id, ${actorId}::uuid)
          THEN applicant.display_name ELSE 'Claim or COI clearance required' END AS "applicantName",
        stage_definition.name AS "stageName",
        NULL::text AS "priority",
        task.status AS "taskStatus",
        task.assigned_role_id AS "assignedRoleId",
        role.name AS "assignedRoleName",
        task.assigned_user_id AS "assignedUserId",
        assignee.display_name AS "assignedUserName",
        task.due_at AS "dueAt",
        task.claimed_at AS "claimedAt",
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
        AND ${actorScope(actorId)}
        AND ${scopeFilter(input.scope)}
        AND ${searchFilter(actorId, input.search)}
    )
    SELECT filtered.*, (SELECT count(*)::integer FROM filtered) AS "totalCount"
    FROM filtered
    WHERE ${cursorFilter(cursor)}
    ORDER BY "dueAt" ASC NULLS LAST, "taskInstanceId" ASC
    LIMIT ${input.limit + 1}
  `;
}

function toQueueRow(row: QueueDatabaseRow): WorkQueueRow {
  return {
    ...row,
    claimedAt: row.claimedAt ? new Date(row.claimedAt).toISOString() : null,
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
    items: rows.map(toQueueRow),
    total: rows[0]?.totalCount ?? 0,
  };
}

type ClaimWriteResult =
  | { kind: "claimed"; result: TaskClaimResult }
  | { kind: "conflict" }
  | { kind: "idempotency_conflict" };

type Transaction = Parameters<
  Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]
>[0];

class ClaimWriteConflict extends Error {}

async function existingClaim(
  transaction: Transaction,
  taskId: string,
  actorId: string,
  idempotencyKey: string,
): Promise<ClaimWriteResult | null> {
  const existing = await transaction.execute(sql`
    SELECT command.task_instance_id AS "taskInstanceId",
      command.actor_id AS "actorId", command.actor_id AS "assignedUserId",
      actor.display_name AS "assignedUserName", command.claimed_at AS "claimedAt",
      command.row_version AS "rowVersion", 'CLAIMED'::text AS "taskStatus"
    FROM app_task_claim_commands command
    JOIN app_users actor ON actor.id = command.actor_id
    WHERE command.idempotency_key = ${idempotencyKey}
  `);
  const command = existing.rows[0] as (
    TaskClaimResult & { actorId: string }
  ) | undefined;
  if (!command) return null;
  if (command.actorId !== actorId || command.taskInstanceId !== taskId) {
    return { kind: "idempotency_conflict" };
  }
  return {
    kind: "claimed",
    result: {
      assignedUserId: command.assignedUserId,
      assignedUserName: command.assignedUserName,
      claimedAt: command.claimedAt,
      rowVersion: command.rowVersion,
      taskInstanceId: command.taskInstanceId,
      taskStatus: command.taskStatus,
    },
  };
}

function claimResultQuery(taskId: string, actorId: string): SQL {
  return sql`
    SELECT task.id AS "taskInstanceId", task.status AS "taskStatus",
      task.assigned_user_id AS "assignedUserId", actor.display_name AS "assignedUserName",
      task.claimed_at AS "claimedAt", task.row_version AS "rowVersion"
    FROM app_workflow_tasks task
    JOIN app_users actor ON actor.id = ${actorId}::uuid
    WHERE task.id = ${taskId}::uuid
  `;
}

export async function writeTaskClaim(input: {
  actorId: string;
  correlationId: string;
  expectedRowVersion: number;
  idempotencyKey: string;
  taskId: string;
}): Promise<ClaimWriteResult> {
  const claimedAt = new Date();
  try {
    return await getDatabase().transaction(async (transaction) => {
      const inserted = await transaction.execute(sql`
        INSERT INTO app_task_claim_commands
          (idempotency_key, task_instance_id, actor_id, claimed_at, row_version)
        VALUES (
          ${input.idempotencyKey}, ${input.taskId}::uuid,
          ${input.actorId}::uuid, ${claimedAt}, ${input.expectedRowVersion + 1}
        )
        ON CONFLICT (idempotency_key) DO NOTHING
        RETURNING idempotency_key
      `);
      if (!inserted.rowCount) {
        const prior = await existingClaim(
          transaction, input.taskId, input.actorId, input.idempotencyKey,
        );
        if (prior) return prior;
        throw new ClaimWriteConflict();
      }
      await transaction.execute(sql`
        SELECT stage.id
        FROM app_workflow_stage_instances stage
        JOIN app_workflow_tasks task ON task.stage_instance_id = stage.id
        WHERE task.id = ${input.taskId}::uuid
        FOR UPDATE OF stage
      `);
      await transaction.execute(sql`
        SELECT id FROM app_users
        WHERE id = ${input.actorId}::uuid
        FOR UPDATE
      `);
      const updated = await transaction.execute(sql`
      WITH eligible AS (
        SELECT task.id, task.assigned_role_id AS "previousRoleId",
          task.stage_instance_id AS "stageInstanceId",
          workflow.id AS "workflowInstanceId"
        FROM app_workflow_tasks task
        JOIN app_workflow_stage_instances stage
          ON stage.id = task.stage_instance_id
        JOIN app_workflow_instances workflow
          ON workflow.id = stage.workflow_instance_id
        JOIN app_stage_task_definitions definition
          ON definition.id = task.workflow_task_definition_id
        JOIN app_applications application
          ON application.id = workflow.application_id
        WHERE task.id = ${input.taskId}::uuid
          AND task.row_version = ${input.expectedRowVersion}
          AND ${eligibleSelfAssignment(input.actorId)}
        FOR UPDATE OF task
      )
      UPDATE app_workflow_tasks task
      SET assigned_user_id = ${input.actorId}::uuid, assigned_role_id = NULL,
        claimed_at = ${claimedAt}, status = 'CLAIMED',
        row_version = row_version + 1
      FROM eligible
      WHERE task.id = eligible.id
      RETURNING eligible."previousRoleId", eligible."stageInstanceId",
        eligible."workflowInstanceId"
      `);
      if (!updated.rowCount) throw new ClaimWriteConflict();
      const auditContext = updated.rows[0] as {
        previousRoleId: string;
        stageInstanceId: string;
        workflowInstanceId: string;
      };
      await transaction.execute(sql`
      INSERT INTO app_workflow_audit_entries
        (actor_id, action, target_type, target_id, correlation_id,
         idempotency_key, workflow_instance_id, stage_instance_id, task_id,
         reason, before, after)
      VALUES (
        ${input.actorId}::uuid, 'TASK_ASSIGNED', 'WORKFLOW_TASK', ${input.taskId},
        ${input.correlationId}::uuid, ${input.idempotencyKey},
        ${auditContext.workflowInstanceId}::uuid,
        ${auditContext.stageInstanceId}::uuid, ${input.taskId}::uuid,
        'Task claimed by eligible user',
        jsonb_build_object(
          'assignedRoleId', ${auditContext.previousRoleId}::text,
          'assignedUserId', NULL,
          'rowVersion', ${input.expectedRowVersion}::integer,
          'status', 'PENDING'
        ),
        jsonb_build_object(
          'assignedUserId', ${input.actorId}::text,
          'rowVersion', ${input.expectedRowVersion + 1}::integer,
          'status', 'CLAIMED'
        )
      )
      `);
      await transaction.execute(sql`
      INSERT INTO app_workflow_events
        (workflow_instance_id, event_code, actor_id, correlation_id, payload)
      VALUES
        (${auditContext.workflowInstanceId}::uuid, 'TASK_ASSIGNED',
          ${input.actorId}::uuid, ${input.correlationId}::uuid,
          jsonb_build_object('stageInstanceId', ${auditContext.stageInstanceId}::text,
            'taskId', ${input.taskId}::text)),
        (${auditContext.workflowInstanceId}::uuid, 'TASK_CLAIMED',
          ${input.actorId}::uuid, ${input.correlationId}::uuid,
          jsonb_build_object('stageInstanceId', ${auditContext.stageInstanceId}::text,
            'taskId', ${input.taskId}::text))
      `);
      const result = await transaction.execute(
        claimResultQuery(input.taskId, input.actorId),
      );
      return { kind: "claimed", result: result.rows[0] as TaskClaimResult };
    });
  } catch (error) {
    if (error instanceof ClaimWriteConflict) return { kind: "conflict" };
    throw error;
  }
}
