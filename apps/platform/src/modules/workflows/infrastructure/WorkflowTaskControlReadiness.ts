import { sql } from "drizzle-orm";

export const workflowTaskControlAllowsCompletion = sql`NOT EXISTS (
  SELECT 1 FROM app_workflow_holds active_hold
  WHERE active_hold.stage_instance_id = stage.id
    AND active_hold.status = 'ACTIVE'
) AND NOT EXISTS (
  SELECT 1 FROM app_workflow_deferrals active_deferral
  WHERE active_deferral.stage_instance_id = stage.id
    AND active_deferral.status = 'ACTIVE'
) AND NOT EXISTS (
  SELECT 1 FROM app_workflow_referrals active_referral
  WHERE active_referral.source_task_id = task.id
    AND active_referral.status = 'ACTIVE'
    AND active_referral.source_task_behavior = 'BLOCKED'
) AND NOT EXISTS (
  SELECT 1 FROM app_workflow_escalations active_escalation
  WHERE active_escalation.task_id = task.id
    AND active_escalation.status = 'ACTIVE'
    AND active_escalation.block_until_resolved
)`;
