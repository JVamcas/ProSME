import "server-only";

import { sql } from "drizzle-orm";
import type { WorkflowActionExecutionTransaction } from "./WorkflowActionExecutionRepository";

type UserSnapshot = { userId: string; displayName: string; email: string };
export type DeadlineNotificationSnapshot = {
  applicationId: string;
  applicationReference: string;
  fundingOpportunityTitle: string;
  stageName: string;
  owner: UserSnapshot;
  assignees: UserSnapshot[];
};

export async function loadWorkflowDeadlineNotificationSnapshot(
  transaction: WorkflowActionExecutionTransaction,
  stageInstanceId: string,
) {
  const result = await transaction.execute<DeadlineNotificationSnapshot>(sql`
    SELECT application.id AS "applicationId",
      application.reference AS "applicationReference",
      funding_call.title AS "fundingOpportunityTitle", definition.name AS "stageName",
      jsonb_build_object('userId', owner.id, 'displayName', owner.display_name,
        'email', owner.email) AS owner,
      coalesce((
        SELECT jsonb_agg(jsonb_build_object('userId', assignee.id,
          'displayName', assignee.display_name, 'email', assignee.email))
        FROM app_users assignee
        WHERE assignee.status = 'active' AND EXISTS (
          SELECT 1 FROM app_workflow_tasks task
          WHERE task.stage_instance_id = stage.id AND task.status <> 'CANCELLED'
            AND (task.assigned_user_id = assignee.id OR (
              task.assigned_user_id IS NULL AND EXISTS (
                SELECT 1 FROM app_user_roles membership
                WHERE membership.user_id = assignee.id AND membership.role_id = task.assigned_role_id
              )
            ))
            ))
        )
      ), '[]'::jsonb) AS assignees
    FROM app_workflow_stage_instances stage
    JOIN app_workflow_stage_definitions definition ON definition.id = stage.workflow_stage_definition_id
    JOIN app_workflow_instances workflow ON workflow.id = stage.workflow_instance_id
    JOIN app_applications application ON application.id = workflow.application_id
    JOIN app_funding_calls funding_call ON funding_call.id = application.funding_opportunity_id
    JOIN app_users owner ON owner.id = application.owner_user_id
    WHERE stage.id = ${stageInstanceId}::uuid
  `);
  if (!result.rows[0]) throw new Error("Workflow deadline notification context is unavailable.");
  return result.rows[0];
}
