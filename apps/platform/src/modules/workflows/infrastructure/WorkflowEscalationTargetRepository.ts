import "server-only";

import { sql } from "drizzle-orm";
import type { WorkflowActionExecutionTransaction } from "./WorkflowActionExecutionRepository";
import {
  workflowReviewerEligibility,
  workflowTaskReviewerUserIds,
} from "./WorkflowReviewerEligibility";

export async function readWorkflowEscalationTargets(
  database: Pick<WorkflowActionExecutionTransaction, "execute">,
  taskId: string,
) {
  const result = await database.execute<{
    id: string;
    label: string;
    targetType: "ROLE" | "USER";
  }>(sql`
    WITH eligible_users AS (
      SELECT candidate.id, candidate.display_name AS label
      FROM app_workflow_tasks task
      JOIN app_stage_task_definitions definition
        ON definition.id = task.workflow_task_definition_id
      JOIN app_workflow_stage_instances stage ON stage.id = task.stage_instance_id
      JOIN app_workflow_instances workflow ON workflow.id = stage.workflow_instance_id
      JOIN app_applications application ON application.id = workflow.application_id
      CROSS JOIN app_users candidate
      WHERE task.id = ${taskId}::uuid
        AND ${workflowReviewerEligibility(workflowTaskReviewerUserIds(sql`task`))}
    ), targets AS (
      SELECT 'USER' AS "targetType", id, label FROM eligible_users
      UNION ALL
      SELECT DISTINCT 'ROLE' AS "targetType", role.id, role.name AS label
      FROM eligible_users candidate
      JOIN app_user_roles membership ON membership.user_id = candidate.id
      JOIN app_roles role ON role.id = membership.role_id
      WHERE role.id IS DISTINCT FROM (
        SELECT assigned_role_id FROM app_workflow_tasks WHERE id = ${taskId}::uuid
      )
    )
    SELECT "targetType", id, label FROM targets
    ORDER BY "targetType", label, id
  `);
  return result.rows;
}
