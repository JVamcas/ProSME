import "server-only";

import { sql } from "drizzle-orm";
import { workflowTaskReviewerUserIds } from "./WorkflowReviewerEligibility";
import type { WorkflowActionExecutionTransaction } from "./WorkflowActionExecutionRepository";

export async function loadEscalationAssignmentContext(
  transaction: WorkflowActionExecutionTransaction,
  taskId: string,
) {
  const result = await transaction.execute<{
    applicationId: string;
    applicationReference: string;
    fundingOpportunityTitle: string;
    stageName: string;
    assignedRoleId: string | null;
    assignedUserId: string | null;
    definitionId: string;
    excludedUserIds: string[];
    name: string;
    stableKey: string;
  }>(sql`
    SELECT application.id AS "applicationId",
      application.reference AS "applicationReference",
      funding_call.title AS "fundingOpportunityTitle",
      stage_definition.name AS "stageName",
      task.assigned_role_id AS "assignedRoleId",
      task.assigned_user_id AS "assignedUserId",
      definition.id AS "definitionId", definition.name,
      definition.code AS "stableKey",
      ${workflowTaskReviewerUserIds(sql`task`)} AS "excludedUserIds"
    FROM app_workflow_tasks task
    JOIN app_stage_task_definitions definition
      ON definition.id = task.workflow_task_definition_id
    JOIN app_workflow_stage_instances stage ON stage.id = task.stage_instance_id
    JOIN app_workflow_stage_definitions stage_definition ON stage_definition.id = stage.workflow_stage_definition_id
    JOIN app_workflow_instances workflow ON workflow.id = stage.workflow_instance_id
    JOIN app_applications application ON application.id = workflow.application_id
    JOIN app_funding_calls funding_call ON funding_call.id = application.funding_opportunity_id
    WHERE task.id = ${taskId}::uuid
    FOR UPDATE OF task
  `);
  return result.rows[0] ?? null;
}
