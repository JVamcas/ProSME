import { sql } from "drizzle-orm";
import { workflowTaskHasActiveHold } from "./WorkflowHoldQueries";

export const workflowTaskControlAllowsCompletion = sql`NOT ${workflowTaskHasActiveHold(sql`task`)} AND NOT EXISTS (
  SELECT 1 FROM app_workflow_deferrals active_deferral
  WHERE active_deferral.stage_instance_id = stage.id
    AND active_deferral.status = 'ACTIVE'
) AND NOT EXISTS (
  SELECT 1 FROM app_workflow_referrals active_referral
  WHERE active_referral.source_task_id = task.id
    AND active_referral.status = 'ACTIVE'
    AND active_referral.source_task_behavior = 'BLOCKED'
)`;
