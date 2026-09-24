import { sql } from "drizzle-orm";

import { permissionCodes } from "@/auth/authorization/permissions";

/** The aliases task, definition, workflow, stage and application belong to the caller. */
export function eligibleSelfAssignment(actorId: string) {
  return sql`
    task.status = 'PENDING'
    AND task.assigned_user_id IS NULL
    AND task.assigned_role_id IS NOT NULL
    AND definition.assignment_mode = 'ROLE'
    AND stage.status = 'ACTIVE'
    AND workflow.status = 'ACTIVE'
    AND application.owner_user_id <> ${actorId}::uuid
    AND EXISTS (
      SELECT 1 FROM app_users candidate
      JOIN app_user_roles membership ON membership.user_id = candidate.id
      WHERE candidate.id = ${actorId}::uuid
        AND candidate.status = 'active'
        AND candidate.user_type = 'staff'
        AND membership.role_id = task.assigned_role_id
    )
    AND EXISTS (
      SELECT 1 FROM app_user_roles granted_role
      JOIN app_role_capabilities grant_record
        ON grant_record.role_id = granted_role.role_id
      JOIN app_capabilities permission
        ON permission.id = grant_record.capability_id
      WHERE granted_role.user_id = ${actorId}::uuid
        AND permission.code = ${permissionCodes.workflowTaskClaim}
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
        JOIN app_capabilities permission
          ON permission.id = grant_record.capability_id
        WHERE granted_role.user_id = ${actorId}::uuid
          AND permission.code = required.code
      )
    )
    AND CASE
      WHEN definition.config -> 'selfAssignment'
        ->> 'maxConcurrentAssignments' IS NULL THEN TRUE
      WHEN definition.config -> 'selfAssignment'
        ->> 'maxConcurrentAssignments' ~ '^[1-9][0-9]{0,8}$'
      THEN (
        SELECT count(*) FROM app_workflow_tasks owned
        WHERE owned.assigned_user_id = ${actorId}::uuid
          AND owned.status IN ('CLAIMED', 'IN_PROGRESS')
      ) < (definition.config -> 'selfAssignment'
        ->> 'maxConcurrentAssignments')::integer
      ELSE FALSE
    END
    AND NOT EXISTS (
      SELECT 1 FROM app_workflow_tasks sibling
      WHERE sibling.stage_instance_id = task.stage_instance_id
        AND sibling.workflow_task_definition_id = task.workflow_task_definition_id
        AND sibling.id <> task.id
        AND sibling.assigned_user_id = ${actorId}::uuid
        AND sibling.status <> 'CANCELLED'
    )
    AND NOT EXISTS (
      SELECT 1 FROM app_workflow_task_coi clearance
      JOIN app_workflow_tasks prior_task ON prior_task.id = clearance.task_id
      WHERE prior_task.stage_instance_id = task.stage_instance_id
        AND clearance.user_id = ${actorId}::uuid
        AND clearance.state IN ('PENDING_REVIEW', 'RECUSED', 'REVOKED')
    )
  `;
}
