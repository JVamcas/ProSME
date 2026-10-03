import { sql, type SQL } from "drizzle-orm";
import { permissionCodes } from "@/auth/authorization/permissions";

export function committedEscalationWork(task: SQL, escalation: SQL) {
  return sql`EXISTS (
    SELECT 1 FROM app_form_responses response
    WHERE response.workflow_task_id = ${task}.id AND response.status = 'COMPLETED'
      AND response.completed_at >= ${escalation}.escalated_at
  )`;
}

export function canCancelOwnEscalation(
  actorId: string,
  task: SQL,
  escalation: SQL,
) {
  return sql`EXISTS (
    SELECT 1 FROM app_user_roles membership
    JOIN app_role_capabilities grant_record ON grant_record.role_id = membership.role_id
    JOIN app_capabilities permission ON permission.id = grant_record.capability_id
    WHERE membership.user_id = ${actorId}::uuid
      AND permission.code = ${permissionCodes.workflowEscalationOwnCancel}
  ) AND NOT ${committedEscalationWork(task, escalation)}`;
}
