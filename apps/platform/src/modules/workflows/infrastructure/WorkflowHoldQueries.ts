import { sql, type SQL } from "drizzle-orm";

export function workflowHoldAffectsStage(hold: SQL, stage: SQL) {
  return sql`${hold}.workflow_instance_id = ${stage}.workflow_instance_id
    AND (${hold}.scope = 'APPLICATION'
      OR (${hold}.scope = 'STAGE' AND ${hold}.stage_instance_id = ${stage}.id))`;
}

export function workflowHoldAffectsTask(hold: SQL, task: SQL) {
  return sql`(
    (${hold}.scope = 'TASK' AND ${hold}.task_id = ${task}.id)
    OR (${hold}.scope = 'STAGE' AND ${hold}.stage_instance_id = ${task}.stage_instance_id)
    OR (${hold}.scope = 'APPLICATION' AND EXISTS (
      SELECT 1 FROM app_workflow_stage_instances held_stage
      WHERE held_stage.id = ${task}.stage_instance_id
        AND held_stage.workflow_instance_id = ${hold}.workflow_instance_id
    ))
  )`;
}

export function workflowTaskHasActiveHold(task: SQL) {
  return sql<boolean>`EXISTS (
    SELECT 1 FROM app_workflow_holds hold
    WHERE hold.status = 'ACTIVE' AND ${workflowHoldAffectsTask(sql`hold`, task)}
  )`;
}

export function workflowStageHasActiveHold(stage: SQL) {
  return sql<boolean>`EXISTS (
    SELECT 1 FROM app_workflow_holds hold
    WHERE hold.status = 'ACTIVE' AND ${workflowHoldAffectsStage(sql`hold`, stage)}
  )`;
}

export function workflowHasActiveApplicationHold(workflowInstanceId: SQL) {
  return sql<boolean>`EXISTS (
    SELECT 1 FROM app_workflow_holds hold
    WHERE hold.workflow_instance_id = ${workflowInstanceId}
      AND hold.scope = 'APPLICATION' AND hold.status = 'ACTIVE'
  )`;
}

export function workflowTaskHoldSummaries(task: SQL) {
  return sql`COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', hold.id, 'scope', hold.scope, 'heldAt', hold.held_at,
      'heldBy', holder.display_name, 'reason', hold.reason, 'reviewAt', hold.review_at
    ) ORDER BY hold.held_at, hold.id)
    FROM app_workflow_holds hold
    JOIN app_users holder ON holder.id = hold.held_by
    WHERE hold.status = 'ACTIVE' AND ${workflowHoldAffectsTask(sql`hold`, task)}
  ), '[]'::jsonb)`;
}
