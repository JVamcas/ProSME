import { sql, type SQLWrapper } from "drizzle-orm";

/** Evaluate current stages against the version pinned to this workflow instance. */
export function applicantWithdrawalAllowed(workflowTable: SQLWrapper) {
  return sql<boolean>`EXISTS (
    SELECT 1
    FROM app_workflow_stage_instances withdrawal_stage
    JOIN app_workflow_stage_definitions withdrawal_definition
      ON withdrawal_definition.id = withdrawal_stage.workflow_stage_definition_id
    JOIN app_workflow_instances withdrawal_workflow
      ON withdrawal_workflow.id = withdrawal_stage.workflow_instance_id
      AND withdrawal_workflow.workflow_template_version_id = withdrawal_definition.version_id
    WHERE withdrawal_stage.workflow_instance_id = ${workflowTable}.id
      AND withdrawal_workflow.status = 'ACTIVE'
      AND withdrawal_stage.status IN ('ACTIVE', 'BLOCKED')
      AND withdrawal_definition.allow_applicant_withdrawal
  )`;
}
