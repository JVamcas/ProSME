import { sql } from "drizzle-orm";

import type { AdminApplicationStatusFilter } from "../ApplicationTypes";

// Shared aliases keep dashboard aggregates and list filters on the same rules.
export const adminApplicationPublicStatusSql = sql`CASE
  WHEN workflow.status IN ('COMPLETED', 'CANCELLED', 'REJECTED')
    THEN COALESCE(workflow.public_status->>'status', 'CLOSED')
  WHEN EXISTS (
    SELECT 1 FROM app_workflow_rfis open_rfi
    WHERE open_rfi.application_id = application.id
      AND open_rfi.recipient_user_id = application.owner_user_id
      AND open_rfi.status = 'OPEN'
  ) THEN 'ACTION_REQUIRED'
  ELSE COALESCE(stage_definition.applicant_status, 'SUBMITTED')
END`;

export const adminApplicationPendingDecisionSql = sql`EXISTS (
  SELECT 1 FROM app_workflow_stage_instances decision_stage
  JOIN app_workflow_tasks decision_task
    ON decision_task.stage_instance_id = decision_stage.id
  WHERE decision_stage.workflow_instance_id = workflow.id
    AND decision_stage.status IN ('ACTIVE', 'BLOCKED')
    AND decision_task.status IN ('PENDING', 'IN_PROGRESS')
    AND EXISTS (
      SELECT 1 FROM app_stage_task_action_bindings binding
      JOIN app_workflow_action_definitions action
        ON action.stage_id = binding.stage_id
        AND action.stable_key = binding.action_key
      WHERE binding.task_definition_id = decision_task.workflow_task_definition_id
        AND action.action_type IN ('APPROVE_ADVANCE', 'REJECT')
    )
)`;

export function adminApplicationStatusPredicate(status: AdminApplicationStatusFilter) {
  if (status === "all") return sql`TRUE`;
  if (status === "pending-decision") return adminApplicationPendingDecisionSql;
  return sql`${adminApplicationPublicStatusSql} = ${status.replaceAll("-", "_").toUpperCase()}`;
}
