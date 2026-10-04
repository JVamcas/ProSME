import "server-only";
import { sql } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import { canCancelOwnEscalation } from "./WorkflowEscalationTrackingSql";
import type { WorkflowEscalationTracking } from "../domain/runtime/WorkflowEscalationTracking";
import type { WorkflowElementPermissions } from "../domain/definitions/WorkflowElementPermissions";

type TrackingRow = Omit<WorkflowEscalationTracking, "actions"> & {
  permissions: WorkflowElementPermissions;
  stageInstanceId: string;
  workflowInstanceId: string;
};

export async function readOwnEscalationTracking(
  actorId: string,
  taskId: string,
): Promise<TrackingRow | null> {
  const result = await getDatabase().execute<TrackingRow>(sql`
    SELECT escalation.id, task.id AS "taskId", task.row_version AS "rowVersion",
      definition.name AS "taskName", stage_definition.name AS "stageName",
      assignee.display_name AS "assignedUserName", role.name AS "assignedRoleName",
      definition.permissions, stage.id AS "stageInstanceId", workflow.id AS "workflowInstanceId",
      ${canCancelOwnEscalation(actorId, sql`task`, sql`escalation`)} AS "canCancel"
    FROM app_workflow_tasks task
    JOIN app_workflow_escalations escalation ON escalation.task_id = task.id
    JOIN app_stage_task_definitions definition ON definition.id = task.workflow_task_definition_id
    JOIN app_workflow_stage_instances stage ON stage.id = task.stage_instance_id
    JOIN app_workflow_stage_definitions stage_definition ON stage_definition.id = stage.workflow_stage_definition_id
    JOIN app_workflow_instances workflow ON workflow.id = stage.workflow_instance_id
    LEFT JOIN app_users assignee ON assignee.id = task.assigned_user_id
    LEFT JOIN app_roles role ON role.id = task.assigned_role_id
    WHERE task.id = ${taskId}::uuid
      AND escalation.source_assigned_user_id = ${actorId}::uuid
      AND escalation.escalated_by = ${actorId}::uuid
      AND escalation.trigger = 'MANUAL' AND escalation.status = 'ACTIVE'
      AND task.assigned_user_id IS DISTINCT FROM ${actorId}::uuid
      AND task.status IN ('PENDING', 'IN_PROGRESS')
      AND workflow.status = 'ACTIVE' AND stage.status IN ('ACTIVE', 'BLOCKED')
      AND app_workflow_task_coi_cleared(task.id, ${actorId}::uuid)
    ORDER BY escalation.escalated_at DESC, escalation.id DESC LIMIT 1
  `);
  return result.rows[0] ?? null;
}
