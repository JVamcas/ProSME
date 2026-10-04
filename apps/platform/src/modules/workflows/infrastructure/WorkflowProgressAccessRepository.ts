import "server-only";

import { sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";

type ProgressTaskContext = {
  applicationId: string;
  workflowInstanceId: string;
  viewPermission: string;
};

export async function readAssignedWorkflowProgressContext(
  actorId: string,
  taskId: string,
): Promise<ProgressTaskContext | null> {
  const result = await getDatabase().execute(sql`
    SELECT workflow.application_id AS "applicationId",
      workflow.id AS "workflowInstanceId",
      definition.permissions ->> 'view' AS "viewPermission"
    FROM app_workflow_tasks task
    JOIN app_stage_task_definitions definition
      ON definition.id = task.workflow_task_definition_id
    JOIN app_workflow_stage_instances stage ON stage.id = task.stage_instance_id
    JOIN app_workflow_instances workflow ON workflow.id = stage.workflow_instance_id
    WHERE task.id = ${taskId}::uuid
      AND task.assigned_user_id = ${actorId}::uuid
      AND app_workflow_task_coi_cleared(task.id, ${actorId}::uuid)
      AND workflow.status = 'ACTIVE'
      AND stage.status IN ('ACTIVE', 'BLOCKED')
    LIMIT 1
  `);

  return (result.rows[0] as ProgressTaskContext | undefined) ?? null;
}
