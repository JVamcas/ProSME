import "server-only";

import { sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";

export type CoiState =
  | "DECLARATION_REQUIRED"
  | "CLEARED_NO_CONFLICT"
  | "PENDING_REVIEW"
  | "CLEARED_AFTER_REVIEW"
  | "RECUSED"
  | "REVOKED";

type GateRow = {
  assignedUserId: string | null;
  gated: boolean;
  rowVersion: number;
  stageInstanceId: string;
  state: CoiState;
  status: string;
  taskId: string;
  taskName: string;
};

export async function readTaskCoiGate(actorId: string, taskId: string) {
  const result = await getDatabase().execute(sql`
    SELECT task.id AS "taskId", definition.name AS "taskName",
      task.status, task.row_version AS "rowVersion",
      task.assigned_user_id AS "assignedUserId",
      stage.id AS "stageInstanceId",
      (definition.coi_required OR stage_definition.coi_gated) AS gated,
      COALESCE(clearance.state, 'DECLARATION_REQUIRED') AS state
    FROM app_workflow_tasks task
    JOIN app_stage_task_definitions definition
      ON definition.id = task.workflow_task_definition_id
    JOIN app_workflow_stage_instances stage ON stage.id = task.stage_instance_id
    JOIN app_workflow_stage_definitions stage_definition
      ON stage_definition.id = stage.workflow_stage_definition_id
    JOIN app_workflow_instances workflow ON workflow.id = stage.workflow_instance_id
    LEFT JOIN app_workflow_task_coi clearance
      ON clearance.task_id = task.id AND clearance.user_id = ${actorId}::uuid
    WHERE task.id = ${taskId}::uuid
      AND stage.status = 'ACTIVE' AND workflow.status = 'ACTIVE'
      AND (
        task.assigned_user_id = ${actorId}::uuid
        OR (task.assigned_user_id IS NULL AND EXISTS (
          SELECT 1 FROM app_user_roles membership
          WHERE membership.user_id = ${actorId}::uuid
            AND membership.role_id = task.assigned_role_id
        ))
      )
  `);
  return (result.rows[0] as GateRow | undefined) ?? null;
}

export async function changeTaskCoi(input: {
  actorId: string;
  taskId: string;
  expectedRowVersion: number;
  decision: "NO_CONFLICT" | "DISCLOSE" | "CLEAR" | "REVOKE";
  disclosureText?: string;
  reason?: string;
  independentReview: boolean;
}) {
  return getDatabase().transaction(async (transaction) => {
    await transaction.execute(sql`
      SELECT stage.id FROM app_workflow_stage_instances stage
      JOIN app_workflow_tasks task ON task.stage_instance_id = stage.id
      WHERE task.id = ${input.taskId}::uuid AND stage.status = 'ACTIVE'
      FOR UPDATE OF stage
    `);
    const locked = await transaction.execute(sql`
      SELECT task.id, task.status, task.row_version AS "rowVersion",
        task.assigned_user_id AS "assignedUserId",
        (definition.coi_required OR stage_definition.coi_gated) AS gated,
        clearance.state, clearance.row_version AS "coiVersion"
      FROM app_workflow_tasks task
      JOIN app_stage_task_definitions definition
        ON definition.id = task.workflow_task_definition_id
      JOIN app_workflow_stage_instances stage ON stage.id = task.stage_instance_id
      JOIN app_workflow_stage_definitions stage_definition
        ON stage_definition.id = stage.workflow_stage_definition_id
      LEFT JOIN app_workflow_task_coi clearance ON clearance.task_id = task.id
      WHERE task.id = ${input.taskId}::uuid AND stage.status = 'ACTIVE'
      FOR UPDATE OF task
    `);
    const row = locked.rows[0] as {
      assignedUserId: string | null;
      coiVersion: number | null;
      gated: boolean;
      rowVersion: number;
      state: CoiState | null;
      status: string;
    } | undefined;
    if (!row || !row.gated || row.rowVersion !== input.expectedRowVersion
      || !["CLAIMED", "IN_PROGRESS"].includes(row.status)) return null;

    const self = row.assignedUserId === input.actorId;
    let next: CoiState;
    if (input.decision === "NO_CONFLICT") {
      if (!self || row.state !== null) return null;
      next = "CLEARED_NO_CONFLICT";
    } else if (input.decision === "DISCLOSE") {
      if (!self || row.state === "RECUSED" || row.state === "REVOKED") return null;
      next = "PENDING_REVIEW";
    } else if (input.decision === "CLEAR") {
      if (!input.independentReview || self || row.state !== "PENDING_REVIEW"
        || !input.reason) return null;
      next = "CLEARED_AFTER_REVIEW";
    } else {
      if (!input.independentReview || self
        || !["CLEARED_NO_CONFLICT", "CLEARED_AFTER_REVIEW"].includes(row.state ?? "")
        || !input.reason) return null;
      next = "REVOKED";
    }
    await transaction.execute(sql`
      INSERT INTO app_workflow_task_coi (task_id, user_id, state, row_version)
      VALUES (${input.taskId}::uuid, ${row.assignedUserId}::uuid, ${next}, 1)
      ON CONFLICT (task_id) DO UPDATE
        SET state = EXCLUDED.state, row_version = app_workflow_task_coi.row_version + 1,
          updated_at = now()
    `);
    await transaction.execute(sql`
      INSERT INTO app_workflow_task_coi_events (
        task_id, subject_user_id, actor_id, from_state, to_state,
        disclosure_text, reason
      ) VALUES (
        ${input.taskId}::uuid, ${row.assignedUserId}::uuid,
        ${input.actorId}::uuid, ${row.state}, ${next},
        ${input.disclosureText ?? null}, ${input.reason ?? null}
      )
    `);
    return { state: next };
  });
}


export async function readPendingTaskCoiDisclosure(
  actorId: string,
  taskId: string,
) {
  const result = await getDatabase().execute(sql`
    SELECT task.id AS "taskId", definition.name AS "taskName",
      task.row_version AS "rowVersion",
      clearance.user_id AS "subjectUserId",
      disclosure.disclosure_text AS "disclosureText"
    FROM app_workflow_tasks task
    JOIN app_stage_task_definitions definition
      ON definition.id = task.workflow_task_definition_id
    JOIN app_workflow_stage_instances stage ON stage.id = task.stage_instance_id
    JOIN app_workflow_task_coi clearance ON clearance.task_id = task.id
    JOIN LATERAL (
      SELECT event.disclosure_text
      FROM app_workflow_task_coi_events event
      WHERE event.task_id = task.id
        AND event.to_state = 'PENDING_REVIEW'
      ORDER BY event.occurred_at DESC, event.id DESC
      LIMIT 1
    ) disclosure ON TRUE
    WHERE task.id = ${taskId}::uuid
      AND clearance.state = 'PENDING_REVIEW'
      AND clearance.user_id <> ${actorId}::uuid
      AND stage.status = 'ACTIVE'
  `);
  return (result.rows[0] as {
    taskId: string;
    taskName: string;
    rowVersion: number;
    subjectUserId: string;
    disclosureText: string;
  } | undefined) ?? null;
}

