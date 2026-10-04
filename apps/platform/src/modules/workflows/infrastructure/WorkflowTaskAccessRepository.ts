import "server-only";

import { sql } from "drizzle-orm";
import { workflowTaskPeerReadAllowed } from "./WorkflowTaskPeerReadSql";
import { getDatabase } from "@/db/client";

type WorkflowTaskAccess = {
  taskId: string;
  taskName: string;
  taskStatus: string;
  rowVersion: number;
};

// This narrow projection is used only after checking all-task read permission.
export async function readWorkflowTaskAccess(actorId: string, taskId: string) {
  const result = await getDatabase().execute<WorkflowTaskAccess>(sql`
    SELECT task.id AS "taskId", definition.name AS "taskName",
      task.status AS "taskStatus", task.row_version AS "rowVersion"
    FROM app_workflow_tasks task
    JOIN app_stage_task_definitions definition
      ON definition.id = task.workflow_task_definition_id
    JOIN app_workflow_stage_instances stage ON stage.id = task.stage_instance_id
    WHERE task.id = ${taskId}::uuid
      AND ${workflowTaskPeerReadAllowed(actorId, sql`task`, sql`definition`, sql`stage`)}
  `);
  return result.rows[0] ?? null;
}
