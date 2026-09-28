import { sql } from "drizzle-orm";

import {
  stageTaskDefinitions,
  workflowTasks,
} from "@/db/schema";

export const workflowTaskPrerequisitesComplete = sql<boolean>`(
  ${stageTaskDefinitions.taskType} <> 'STAGE_DECISION'
  OR NOT EXISTS (
    SELECT 1
    FROM app_workflow_tasks prerequisite
    JOIN app_stage_task_definitions prerequisite_definition
      ON prerequisite_definition.id = prerequisite.workflow_task_definition_id
    WHERE prerequisite.stage_instance_id = ${workflowTasks.stageInstanceId}
      AND prerequisite.id <> ${workflowTasks.id}
      AND prerequisite_definition.task_type = 'CONTRIBUTING'
      AND prerequisite.status NOT IN ('COMPLETED', 'CANCELLED')
  )
)`;
