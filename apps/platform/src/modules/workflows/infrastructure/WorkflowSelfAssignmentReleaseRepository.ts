import "server-only";

import { sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";

type ReleaseInput = {
  actorId: string;
  correlationId: string;
  expectedRowVersion: number;
  idempotencyKey: string;
  taskId: string;
};

type ReleaseResult = {
  rowVersion: number;
  taskInstanceId: string;
  taskStatus: "PENDING";
};

type ReleaseOutcome =
  | { kind: "released"; result: ReleaseResult }
  | { kind: "conflict" }
  | { kind: "idempotency_conflict" };

type Transaction = Parameters<
  Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]
>[0];

async function readReleaseReplay(
  transaction: Transaction,
  input: ReleaseInput,
): Promise<ReleaseOutcome | null> {
  const replay = await transaction.execute(sql`
    SELECT action, actor_id AS "actorId", task_id AS "taskId",
      before ->> 'rowVersion' AS "previousVersion",
      after ->> 'rowVersion' AS "rowVersion"
    FROM app_workflow_audit_entries
    WHERE idempotency_key = ${input.idempotencyKey}
    LIMIT 1
  `);
  const prior = replay.rows[0] as {
    action: string;
    actorId: string;
    taskId: string;
    previousVersion: string | null;
    rowVersion: string | null;
  } | undefined;
  if (!prior) return null;
  if (prior.action !== "TASK_RELEASED"
    || prior.actorId !== input.actorId || prior.taskId !== input.taskId
    || Number(prior.previousVersion) !== input.expectedRowVersion
    || !prior.rowVersion) {
    return { kind: "idempotency_conflict" };
  }
  return {
    kind: "released",
    result: {
      rowVersion: Number(prior.rowVersion),
      taskInstanceId: input.taskId,
      taskStatus: "PENDING",
    },
  };
}

export async function releaseSelfAssignedTask(
  input: ReleaseInput,
): Promise<ReleaseOutcome> {
  return getDatabase().transaction(async (transaction) => {
    const replay = await readReleaseReplay(transaction, input);
    if (replay) return replay;
    await transaction.execute(sql`
      SELECT stage.id FROM app_workflow_stage_instances stage
      JOIN app_workflow_tasks task ON task.stage_instance_id = stage.id
      WHERE task.id = ${input.taskId}::uuid
      FOR UPDATE OF stage
    `);
    const concurrentReplay = await readReleaseReplay(transaction, input);
    if (concurrentReplay) return concurrentReplay;
    const candidate = await transaction.execute(sql`
      SELECT task.id, task.row_version AS "rowVersion",
        task.stage_instance_id AS "stageInstanceId",
        workflow.id AS "workflowInstanceId",
        claim.before ->> 'assignedRoleId' AS "assignedRoleId"
      FROM app_workflow_tasks task
      JOIN app_stage_task_definitions definition
        ON definition.id = task.workflow_task_definition_id
      JOIN app_workflow_stage_instances stage
        ON stage.id = task.stage_instance_id
      JOIN app_workflow_instances workflow
        ON workflow.id = stage.workflow_instance_id
      JOIN LATERAL (
        SELECT audit.before FROM app_workflow_audit_entries audit
        WHERE audit.task_id = task.id AND audit.action = 'TASK_ASSIGNED'
          AND audit.actor_id = ${input.actorId}::uuid
        ORDER BY audit.runtime_sequence DESC LIMIT 1
      ) claim ON TRUE
      WHERE task.id = ${input.taskId}::uuid
        AND task.assigned_user_id = ${input.actorId}::uuid
        AND task.status = 'CLAIMED'
        AND task.row_version = ${input.expectedRowVersion}
        AND task.started_at IS NULL
        AND task.result IS NULL
        AND stage.status = 'ACTIVE' AND workflow.status = 'ACTIVE'
        AND definition.config -> 'selfAssignment' ->> 'allowRelease' = 'true'
        AND NOT EXISTS (
          SELECT 1 FROM app_form_responses response
          WHERE response.workflow_task_id = task.id
        )
        AND NOT EXISTS (
          SELECT 1 FROM app_workflow_task_coi clearance
          WHERE clearance.task_id = task.id
        )
      FOR UPDATE OF task
    `);
    const row = candidate.rows[0] as {
      assignedRoleId: string | null;
      rowVersion: number;
      stageInstanceId: string;
      workflowInstanceId: string;
    } | undefined;
    if (!row?.assignedRoleId) return { kind: "conflict" };
    await transaction.execute(sql`
      UPDATE app_workflow_tasks
      SET assigned_user_id = NULL, assigned_role_id = ${row.assignedRoleId}::uuid,
        claimed_at = NULL, status = 'PENDING', row_version = row_version + 1
      WHERE id = ${input.taskId}::uuid
    `);
    await transaction.execute(sql`
      INSERT INTO app_workflow_audit_entries (
        actor_id, action, target_type, target_id, correlation_id,
        idempotency_key, workflow_instance_id, stage_instance_id, task_id,
        reason, before, after
      ) VALUES (
        ${input.actorId}::uuid, 'TASK_RELEASED', 'WORKFLOW_TASK',
        ${input.taskId}, ${input.correlationId}::uuid,
        ${input.idempotencyKey}, ${row.workflowInstanceId}::uuid,
        ${row.stageInstanceId}::uuid, ${input.taskId}::uuid,
        'Owner released an untouched self-assigned task',
        jsonb_build_object('assignedUserId', ${input.actorId}::text,
          'rowVersion', ${input.expectedRowVersion}::integer, 'status', 'CLAIMED'),
        jsonb_build_object('assignedRoleId', ${row.assignedRoleId}::text,
          'rowVersion', ${input.expectedRowVersion + 1}::integer, 'status', 'PENDING')
      )
    `);
    await transaction.execute(sql`
      INSERT INTO app_workflow_events (
        workflow_instance_id, event_code, actor_id, correlation_id, payload
      ) VALUES (
        ${row.workflowInstanceId}::uuid, 'TASK_RELEASED',
        ${input.actorId}::uuid, ${input.correlationId}::uuid,
        jsonb_build_object('taskId', ${input.taskId}::text)
      )
    `);
    return {
      kind: "released",
      result: {
        rowVersion: input.expectedRowVersion + 1,
        taskInstanceId: input.taskId,
        taskStatus: "PENDING",
      },
    };
  });
}
