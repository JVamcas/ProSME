import "server-only";

import { sql } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import { permissionCodes } from "@/auth/authorization/permissions";
import { systemSeedUserEmail, systemSeedUserId } from "@/platform/database/SystemSeedPrincipal";
import type { WorkflowDeadlineCandidate } from "../domain/runtime/WorkflowDeadline";
import type { WorkflowActionExecutionTransaction } from "./WorkflowActionExecutionRepository";
import { workflowTaskEffectiveDeadline } from "./WorkflowSlaDeadline";

export async function workflowProcessorHasPermission(
  executor: Pick<WorkflowActionExecutionTransaction, "execute"> = getDatabase(),
) {
  const result = await executor.execute<{ allowed: boolean }>(sql`
    SELECT EXISTS (
      SELECT 1 FROM app_users principal
      JOIN app_user_roles grant_role ON grant_role.user_id = principal.id
      JOIN app_role_capabilities grant_permission ON grant_permission.role_id = grant_role.role_id
      JOIN app_capabilities permission ON permission.id = grant_permission.capability_id
      WHERE principal.id = ${systemSeedUserId}::uuid
        AND principal.email = ${systemSeedUserEmail}
        AND principal.status = 'disabled'
        AND permission.code = ${permissionCodes.workflowDeadlineAllProcess}
    ) AS allowed
  `);
  return result.rows[0]?.allowed === true;
}

export async function loadDueWorkflowDeadlines(
  now: Date,
  batchSize: number,
  executor: Pick<WorkflowActionExecutionTransaction, "execute"> = getDatabase(),
  occurrenceKey?: string,
) {
  const effectiveDueAt = workflowTaskEffectiveDeadline(sql`task`, sql`${now}::timestamptz`);
  const result = await executor.execute<WorkflowDeadlineCandidate>(sql`
    WITH due AS (
      SELECT 'SLA_BREACH' AS kind, task.id AS source_id,
        stage.id AS stage_id, task.id AS task_id, stage.workflow_instance_id,
        ${effectiveDueAt} AS scheduled_for,
        'sla:' || task.id::text AS occurrence_key
      FROM app_workflow_tasks task
      JOIN app_workflow_stage_instances stage ON stage.id = task.stage_instance_id
      WHERE task.status IN ('PENDING', 'IN_PROGRESS') AND stage.status = 'ACTIVE'
        AND task.due_at <= ${now}
        AND ${effectiveDueAt} <= ${now}
        AND NOT EXISTS (SELECT 1 FROM app_workflow_rfis rfi
          WHERE rfi.task_id = task.id AND rfi.status = 'OPEN')
        AND NOT EXISTS (SELECT 1 FROM app_workflow_referrals referral
          WHERE referral.source_task_id = task.id AND referral.status = 'ACTIVE'
            AND referral.source_task_behavior = 'BLOCKED')
      UNION ALL
      SELECT 'RFI_EXPIRED', rfi.id, rfi.stage_instance_id, rfi.task_id,
        rfi.workflow_instance_id, rfi.deadline_at, 'rfi-expired:' || rfi.id::text
      FROM app_workflow_rfis rfi
      JOIN app_workflow_stage_instances stage ON stage.id = rfi.stage_instance_id
      JOIN app_workflow_tasks task ON task.id = rfi.task_id
      WHERE rfi.status = 'OPEN' AND rfi.deadline_at <= ${now}
        AND stage.status = 'ACTIVE' AND task.status IN ('PENDING', 'IN_PROGRESS')
      UNION ALL
      SELECT 'RFI_REMINDER', rfi.id, rfi.stage_instance_id, rfi.task_id,
        rfi.workflow_instance_id,
        rfi.created_at + offset_days.value::integer * interval '1 day',
        'rfi-reminder:' || rfi.id::text || ':' || offset_days.value
      FROM app_workflow_rfis rfi
      JOIN app_workflow_stage_instances stage ON stage.id = rfi.stage_instance_id
      JOIN app_workflow_tasks task ON task.id = rfi.task_id
      CROSS JOIN LATERAL jsonb_array_elements_text(rfi.reminder_day_offsets) offset_days(value)
      WHERE rfi.status = 'OPEN' AND rfi.deadline_at > ${now}
        AND stage.status = 'ACTIVE' AND task.status IN ('PENDING', 'IN_PROGRESS')
        AND rfi.created_at + offset_days.value::integer * interval '1 day' <= ${now}
      UNION ALL
      SELECT 'DEFERRAL_RESUMED', deferral.id, deferral.stage_instance_id,
        deferral.task_id, deferral.workflow_instance_id, deferral.resume_at,
        'deferral:' || deferral.id::text
      FROM app_workflow_deferrals deferral
      JOIN app_workflow_stage_instances stage ON stage.id = deferral.stage_instance_id
      WHERE deferral.status = 'ACTIVE' AND deferral.continuation = 'RESUME_ON_DATE'
        AND deferral.mode = 'DATE' AND deferral.resume_at <= ${now}
        AND stage.status = 'BLOCKED'
        AND NOT EXISTS (SELECT 1 FROM app_workflow_holds hold
          WHERE hold.stage_instance_id = stage.id AND hold.status = 'ACTIVE')
      UNION ALL
      SELECT 'HOLD_REVIEW', hold.id, hold.stage_instance_id, hold.task_id,
        hold.workflow_instance_id, hold.review_at, 'hold-review:' || hold.id::text
      FROM app_workflow_holds hold
      JOIN app_workflow_stage_instances stage ON stage.id = hold.stage_instance_id
      WHERE hold.status = 'ACTIVE' AND hold.review_at <= ${now} AND stage.status = 'BLOCKED'
    )
    SELECT due.kind, due.source_id AS "sourceId", due.stage_id AS "stageInstanceId",
      due.task_id AS "taskId", due.workflow_instance_id AS "workflowInstanceId",
      due.scheduled_for AS "scheduledFor", due.occurrence_key AS "occurrenceKey"
    FROM due
    JOIN app_workflow_instances workflow ON workflow.id = due.workflow_instance_id
    LEFT JOIN app_workflow_deadline_executions execution ON execution.occurrence_key = due.occurrence_key
    WHERE workflow.status = 'ACTIVE' AND execution.processed_at IS NULL
      AND (execution.retry_at IS NULL OR execution.retry_at <= ${now})
      AND (${occurrenceKey ?? null}::text IS NULL OR due.occurrence_key = ${occurrenceKey ?? null})
    ORDER BY due.scheduled_for, due.occurrence_key
    LIMIT ${batchSize}
  `);
  return result.rows;
}

export async function lockWorkflowDeadline(
  transaction: WorkflowActionExecutionTransaction,
  candidate: WorkflowDeadlineCandidate,
) {
  const lock = await transaction.execute<{ locked: boolean }>(sql`
    SELECT pg_try_advisory_xact_lock(hashtextextended(${candidate.workflowInstanceId}, 0)) AS locked
  `);
  if (!lock.rows[0]?.locked) return false;
  const existing = await transaction.execute(sql`
    SELECT 1 FROM app_workflow_deadline_executions
    WHERE occurrence_key = ${candidate.occurrenceKey} AND processed_at IS NOT NULL
  `);
  return existing.rows.length === 0;
}

export async function recordWorkflowDeadlineResult(
  transaction: WorkflowActionExecutionTransaction,
  candidate: WorkflowDeadlineCandidate,
  processedAt: Date | null,
  errorCode: string | null = null,
) {
  await transaction.execute(sql`
    INSERT INTO app_workflow_deadline_executions
      (occurrence_key, workflow_instance_id, kind, scheduled_for, processed_at,
        attempt_count, retry_at, last_error_code)
    VALUES (${candidate.occurrenceKey}, ${candidate.workflowInstanceId}::uuid,
      ${candidate.kind}, ${candidate.scheduledFor}, ${processedAt}, 1,
      CASE WHEN ${processedAt}::timestamptz IS NULL THEN now() + interval '1 minute' ELSE NULL END,
      ${errorCode})
    ON CONFLICT (occurrence_key) DO UPDATE SET
      attempt_count = app_workflow_deadline_executions.attempt_count + 1,
      processed_at = EXCLUDED.processed_at, last_error_code = EXCLUDED.last_error_code,
      retry_at = CASE WHEN EXCLUDED.processed_at IS NULL THEN now()
        + least(3600, 60 * power(2, least(app_workflow_deadline_executions.attempt_count, 6)))
          * interval '1 second' ELSE NULL END
    WHERE app_workflow_deadline_executions.processed_at IS NULL
  `);
}

export function withWorkflowDeadlineTransaction<T>(
  work: (transaction: WorkflowActionExecutionTransaction) => Promise<T>,
) {
  return getDatabase().transaction(async (transaction) => {
    await transaction.execute(sql`SET LOCAL statement_timeout = '5000'`);
    await transaction.execute(sql`SET LOCAL lock_timeout = '1000'`);
    return work(transaction);
  });
}
