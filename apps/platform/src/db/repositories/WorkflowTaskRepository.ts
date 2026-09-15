import "server-only";

import { sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import type { TaskDetail } from "@/modules/work-queue/TaskTypes";

type TaskDetailRow = Omit<
  TaskDetail,
  "checklistItems" | "dueAt" | "resultItems"
> & {
  config: unknown;
  dueAt: Date | string | null;
  result: unknown;
};

export async function readWorkflowTask(
  actorId: string,
  taskId: string,
): Promise<TaskDetailRow | null> {
  const result = await getDatabase().execute(sql`
    SELECT task.id AS "taskInstanceId", task.status AS "taskStatus",
      task.type_snapshot AS "taskType", task.row_version AS "rowVersion",
      task.due_at AS "dueAt", task.result,
      definition.name AS "taskName", definition.config,
      stage_definition.name AS "stageName",
      application.id AS "applicationId", application.reference,
      applicant.display_name AS "applicantName",
      NULLIF(COALESCE(business.trading_name, business.legal_name), '') AS "businessName",
      opportunity.funding_opportunity_title AS "fundingCallTitle"
    FROM app_stage_task_instances task
    JOIN app_stage_task_definitions definition
      ON definition.id = task.task_definition_id
    JOIN app_workflow_stage_instances stage ON stage.id = task.stage_instance_id
    JOIN app_workflow_stage_definitions stage_definition
      ON stage_definition.id = stage.stage_definition_id
    JOIN app_workflow_instances workflow ON workflow.id = stage.workflow_instance_id
    JOIN app_applications application ON application.id = workflow.application_id
    JOIN app_users applicant ON applicant.id = application.owner_user_id
    JOIN app_funding_opportunity_workflows opportunity
      ON opportunity.funding_opportunity_id = application.funding_opportunity_id
      AND opportunity.workflow_version_id = workflow.workflow_version_id
    LEFT JOIN app_business_profiles business
      ON business.id::text = application.business_section ->> 'businessId'
    WHERE task.id = ${taskId}::uuid
      AND workflow.status = 'ACTIVE'
      AND stage.status = 'ACTIVE'
      AND (
        task.assignment_user_id = ${actorId}::uuid
        OR task.assignment_role_id IN (
          SELECT role_id FROM app_user_roles WHERE user_id = ${actorId}::uuid
        )
      )
  `);
  return (result.rows[0] as TaskDetailRow | undefined) ?? null;
}
