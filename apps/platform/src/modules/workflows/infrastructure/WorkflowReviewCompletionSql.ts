import { sql, type SQL } from "drizzle-orm";

export function requiredWorkflowReviewCompletions(definition: SQL) {
  return sql<number>`CASE ${definition}.completion_mode
    WHEN 'ALL' THEN ${definition}.reviewer_count
    WHEN 'COUNT' THEN ${definition}.required_completion_count
    WHEN 'PERCENT' THEN ceil(
      ${definition}.reviewer_count * ${definition}.completion_percentage / 100.0
    )::integer
    ELSE ${definition}.reviewer_count
  END`;
}

// Completion progress and decision prerequisites count the same cleared,
// current task instances with submitted form evidence.
export function workflowReviewCompletionEvidence(
  task: SQL,
  definition: SQL,
  completingTaskId?: string,
  previewFormSubmission = false,
) {
  return sql`(
    (${task}.status = 'COMPLETED'
      OR (${task}.id = ${completingTaskId ?? null}::uuid
        AND ${task}.status IN ('PENDING', 'IN_PROGRESS')))
    AND app_workflow_task_coi_cleared(${task}.id, ${task}.assigned_user_id)
    AND NOT EXISTS (
      SELECT 1 FROM app_workflow_tasks successor
      WHERE successor.supersedes_task_id = ${task}.id
    )
    AND (
      ${task}.form_version_id IS NULL
      OR (
        ${previewFormSubmission}
        AND ${task}.id = ${completingTaskId ?? null}::uuid
        AND ${definition}.task_type = 'STAGE_DECISION'
        AND COALESCE(${definition}.config ->> 'command', '') <> 'AUTHORITATIVE_ELIGIBILITY'
        AND COALESCE(${definition}.config ->> 'formPurpose', '') <> 'ELIGIBILITY_VERIFICATION'
      )
      OR EXISTS (
        SELECT 1 FROM app_form_responses response
        WHERE response.workflow_task_id = ${task}.id
          AND (
            response.status = 'COMPLETED'
            OR (
              (${definition}.config ->> 'command' = 'AUTHORITATIVE_ELIGIBILITY'
                OR ${definition}.config ->> 'formPurpose' = 'ELIGIBILITY_VERIFICATION')
              AND response.values = (${task}.result -> 'evaluatedFormValues')
            )
          )
      )
    )
  )`;
}
