import "server-only";
import { sql } from "drizzle-orm";

export function adminApplicationVisibilityFilter(
  actorId: string,
  visibility: "all" | "assigned",
) {
  if (visibility === "all") return sql`TRUE`;
  return sql`EXISTS (
    SELECT 1
    FROM app_workflow_tasks visible_task
    JOIN app_workflow_stage_instances visible_stage
      ON visible_stage.id = visible_task.stage_instance_id
    WHERE visible_stage.workflow_instance_id = workflow.id
      AND visible_stage.status IN ('ACTIVE', 'BLOCKED')
      AND visible_task.status IN ('PENDING', 'IN_PROGRESS')
      AND (
        visible_task.assigned_user_id = ${actorId}::uuid
        OR visible_task.assigned_role_id IN (
          SELECT role_id FROM app_user_roles WHERE user_id = ${actorId}::uuid
        )
      )
  )`;
}
