import { sql, type SQL } from "drizzle-orm";

export function workflowApprovalEligibilityReady(workflowId: SQL) {
  return sql<boolean>`NOT EXISTS (
    SELECT 1
    FROM app_workflow_tasks screening_task
    JOIN app_stage_task_definitions screening_definition
      ON screening_definition.id = screening_task.workflow_task_definition_id
    JOIN app_workflow_stage_instances screening_stage
      ON screening_stage.id = screening_task.stage_instance_id
    WHERE screening_stage.workflow_instance_id = ${workflowId}
      AND screening_definition.config ->> 'command' = 'AUTHORITATIVE_ELIGIBILITY'
      AND screening_stage.status <> 'CANCELLED'
      AND NOT EXISTS (
        SELECT 1 FROM app_workflow_stage_instances newer_stage
        WHERE newer_stage.workflow_instance_id = screening_stage.workflow_instance_id
          AND newer_stage.workflow_stage_definition_id = screening_stage.workflow_stage_definition_id
          AND newer_stage.iteration_number > screening_stage.iteration_number
      )
      AND NOT EXISTS (
        SELECT 1 FROM app_authoritative_eligibility_outcomes outcome
        WHERE outcome.workflow_task_id = screening_task.id
          AND outcome.id::text = screening_task.result ->> 'evaluationId'
          AND jsonb_array_length(outcome.hard_failures) = 0
          AND outcome.evaluation_number = (
            SELECT max(latest.evaluation_number)
            FROM app_authoritative_eligibility_outcomes latest
            WHERE latest.workflow_task_id = screening_task.id
          )
          AND (screening_task.form_version_id IS NULL OR EXISTS (
            SELECT 1 FROM app_form_responses response
            WHERE response.workflow_task_id = screening_task.id
              AND response.form_version_id = screening_task.form_version_id
              AND response.values = screening_task.result -> 'evaluatedFormValues'
          ))
      )
  )`;
}
