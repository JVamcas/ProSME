import { sql, type SQL } from "drizzle-orm";

// Administrative reads must preserve configured review release when the viewer
// is also a reviewer of the same task definition in this stage run.
export function workflowTaskPeerReadAllowed(
  actorId: string,
  task: SQL,
  definition: SQL,
  stage: SQL,
): SQL {
  return sql`NOT (
    ${task}.assigned_user_id IS DISTINCT FROM ${actorId}::uuid
    AND ${definition}.reviewer_count > 1
    AND ${definition}.review_release <> 'IMMEDIATE'
    AND ${stage}.status <> 'COMPLETED'
    AND NOT EXISTS (
      SELECT 1 FROM app_workflow_reworks released_rework
      WHERE released_rework.source_stage_instance_id = ${stage}.id
    )
    AND NOT (
      ${definition}.review_release = 'THRESHOLD_MET'
      AND EXISTS (
        SELECT 1 FROM app_workflow_review_threshold_evaluations release_threshold
        WHERE release_threshold.stage_instance_id = ${stage}.id
          AND release_threshold.task_definition_id = ${definition}.id
          AND release_threshold.first_satisfied = true
      )
    )
    AND EXISTS (
      SELECT 1 FROM app_workflow_tasks own_review
      WHERE own_review.stage_instance_id = ${stage}.id
        AND own_review.workflow_task_definition_id = ${definition}.id
        AND own_review.assigned_user_id = ${actorId}::uuid
        AND NOT EXISTS (
          SELECT 1 FROM app_workflow_tasks own_successor
          WHERE own_successor.supersedes_task_id = own_review.id
            AND own_successor.stage_instance_id = own_review.stage_instance_id
        )
    )
  )`;
}
