import { sql, type SQL } from "drizzle-orm";

// Query aliases identify the candidate, task definition, workflow and application.
export function workflowReviewerEligibility(excludedUserIds: SQL) {
  return sql`NOT ${excludedUserIds} ? candidate.id::text
    AND candidate.status = 'active'
    AND candidate.id <> application.owner_user_id
    AND NOT EXISTS (
      SELECT 1 FROM app_workflow_application_coi clearance
      WHERE clearance.application_id = workflow.application_id
        AND clearance.user_id = candidate.id
        AND clearance.state IN ('PENDING_REVIEW', 'RECUSED', 'REVOKED')
    )
    AND NOT EXISTS (
      SELECT 1 FROM (
        VALUES (definition.permissions ->> 'view'),
          (definition.permissions ->> 'edit'),
          (definition.permissions ->> 'decide')
      ) required(code)
      WHERE required.code IS NULL OR NOT EXISTS (
        SELECT 1 FROM app_user_roles granted_role
        JOIN app_role_capabilities grant_record
          ON grant_record.role_id = granted_role.role_id
        JOIN app_capabilities permission ON permission.id = grant_record.capability_id
        WHERE granted_role.user_id = candidate.id AND permission.code = required.code
      )
    )`;
}

export function workflowTaskReviewerUserIds(task: SQL) {
  return sql`COALESCE((
    SELECT jsonb_agg(peer.assigned_user_id)
    FROM app_workflow_tasks peer
    WHERE peer.stage_instance_id = ${task}.stage_instance_id
      AND peer.workflow_task_definition_id = ${task}.workflow_task_definition_id
      AND peer.status <> 'CANCELLED'
      AND peer.assigned_user_id IS NOT NULL
  ), '[]'::jsonb)`;
}
