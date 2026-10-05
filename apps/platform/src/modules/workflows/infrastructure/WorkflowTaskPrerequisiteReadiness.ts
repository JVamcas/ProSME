import { sql, type SQL } from "drizzle-orm";

import { stageTaskDefinitions } from "./workflow.schema";
import { workflowTasks } from "./workflow-runtime.schema";
import {
  requiredWorkflowReviewCompletions,
  workflowReviewCompletionEvidence,
} from "./WorkflowReviewCompletionSql";

export function workflowTaskPrerequisitesSatisfied(task: SQL, definition: SQL) {
  return sql<boolean>`(
    ${definition}.task_type <> 'STAGE_DECISION'
    OR NOT EXISTS (
      SELECT 1
      FROM app_stage_task_definitions prerequisite_definition
      JOIN app_workflow_stage_instances prerequisite_stage
        ON prerequisite_stage.workflow_stage_definition_id = prerequisite_definition.stage_id
      WHERE prerequisite_stage.id = ${task}.stage_instance_id
        AND prerequisite_definition.task_type = 'CONTRIBUTING'
        AND prerequisite_definition.required = TRUE
        AND (
          SELECT count(*)
          FROM app_workflow_tasks prerequisite
          WHERE prerequisite.stage_instance_id = prerequisite_stage.id
            AND prerequisite.workflow_task_definition_id = prerequisite_definition.id
            AND ${workflowReviewCompletionEvidence(sql`prerequisite`, sql`prerequisite_definition`)}
        ) < ${requiredWorkflowReviewCompletions(sql`prerequisite_definition`)}
    )
  )`;
}

export const workflowTaskPrerequisitesComplete =
  workflowTaskPrerequisitesSatisfied(
    sql`${workflowTasks}`,
    sql`${stageTaskDefinitions}`,
  );
