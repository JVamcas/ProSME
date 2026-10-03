import "server-only";

import { eq, sql } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import { workflowTasks } from "./workflow-runtime.schema";
import type { WorkflowActionExecutionTransaction } from "./WorkflowActionExecutionRepository";
import { committedEscalationWork } from "./WorkflowEscalationTrackingSql";
import { appendControlRecords } from "./WorkflowControlRepository";

export type EscalationCancellationContext = {
  escalationId: string;
  escalationStatus: string;
  escalatedBy: string;
  trigger: string;
  assignedUserId: string | null;
  assignedRoleId: string | null;
  sourceAssignedUserId: string | null;
  sourceAssignedRoleId: string | null;
  taskStatus: string;
  rowVersion: number;
  stageStatus: string;
  stageInstanceId: string;
  workflowStatus: string;
  workflowInstanceId: string;
};

export function withEscalationCancellationTransaction<T>(
  work: (transaction: WorkflowActionExecutionTransaction) => Promise<T>,
) {
  return getDatabase().transaction(work);
}

export async function lockEscalationCancellationContext(
  transaction: WorkflowActionExecutionTransaction,
  taskId: string,
  escalationId: string,
) {
  // Lock the stage before the task, matching action execution and completion.
  // A concurrent commit either finishes first or sees the restored assignment.
  await transaction.execute(sql`
    SELECT stage.id FROM app_workflow_stage_instances stage
    JOIN app_workflow_tasks task ON task.stage_instance_id = stage.id
    WHERE task.id = ${taskId}::uuid FOR UPDATE OF stage
  `);
  const result = await transaction.execute<EscalationCancellationContext>(sql`
    SELECT escalation.id AS "escalationId", escalation.status AS "escalationStatus",
      escalation.escalated_by AS "escalatedBy", escalation.trigger,
      escalation.source_assigned_user_id AS "sourceAssignedUserId",
      escalation.source_assigned_role_id AS "sourceAssignedRoleId",
      task.assigned_user_id AS "assignedUserId", task.assigned_role_id AS "assignedRoleId",
      task.status AS "taskStatus", task.row_version AS "rowVersion",
      stage.id AS "stageInstanceId", stage.status AS "stageStatus",
      workflow.id AS "workflowInstanceId", workflow.status AS "workflowStatus"
    FROM app_workflow_tasks task
    JOIN app_workflow_stage_instances stage ON stage.id = task.stage_instance_id
    JOIN app_workflow_instances workflow ON workflow.id = stage.workflow_instance_id
    JOIN app_workflow_escalations escalation ON escalation.task_id = task.id
    WHERE task.id = ${taskId}::uuid AND escalation.id = ${escalationId}::uuid
    FOR UPDATE OF task, escalation
  `);
  return result.rows[0] ?? null;
}

export async function hasCommittedEscalationWork(
  transaction: WorkflowActionExecutionTransaction,
  taskId: string,
  escalationId: string,
) {
  // Read after acquiring task locks: a submission that committed while we waited
  // must be visible before deciding whether to restore the assignment.
  const result = await transaction.execute<{ committed: boolean }>(sql`
    SELECT ${committedEscalationWork(sql`task`, sql`escalation`)} AS committed
    FROM app_workflow_tasks task
    JOIN app_workflow_escalations escalation ON escalation.task_id = task.id
    WHERE task.id = ${taskId}::uuid AND escalation.id = ${escalationId}::uuid
  `);
  return result.rows[0]?.committed ?? false;
}

export async function persistEscalationCancellation(
  transaction: WorkflowActionExecutionTransaction,
  context: EscalationCancellationContext,
  input: { actorId: string; correlationId: string; taskId: string },
) {
  const resolvedAt = new Date();
  await transaction.execute(sql`
    WITH RECURSIVE chain AS (
      SELECT id FROM app_workflow_escalations
      WHERE id = ${context.escalationId}::uuid AND status = 'ACTIVE'
      UNION ALL
      SELECT child.id FROM app_workflow_escalations child
      JOIN chain parent ON child.parent_escalation_id = parent.id
      WHERE child.status = 'ACTIVE' AND child.task_id = ${input.taskId}::uuid
    ), cancelled AS (
      UPDATE app_workflow_escalations escalation
      SET status = 'RESOLVED', resolved_by = ${input.actorId}::uuid,
        resolved_at = ${resolvedAt}::timestamptz
      WHERE escalation.id IN (SELECT id FROM chain)
      RETURNING escalation.id
    ), events AS (
      INSERT INTO app_workflow_events (workflow_instance_id, event_code, actor_id, correlation_id, payload)
      SELECT ${context.workflowInstanceId}::uuid, 'WORKFLOW_ESCALATION_CANCELLED',
        ${input.actorId}::uuid, ${input.correlationId}::uuid,
        jsonb_build_object('escalationId', id, 'cancelledFromEscalationId', ${context.escalationId}::text,
          'status', 'RESOLVED', 'resolution', 'CANCELLED')
      FROM cancelled
    )
    INSERT INTO app_workflow_audit_entries (
      actor_id, action, target_type, target_id, correlation_id, workflow_instance_id,
      stage_instance_id, task_id, before, after
    )
    SELECT ${input.actorId}::uuid, 'WORKFLOW_ESCALATION_CANCELLED', 'WORKFLOW_ESCALATION',
      id::text, ${input.correlationId}::uuid, ${context.workflowInstanceId}::uuid,
      ${context.stageInstanceId}::uuid, ${input.taskId}::uuid,
      jsonb_build_object('status', 'ACTIVE'),
      jsonb_build_object('status', 'RESOLVED', 'resolution', 'CANCELLED',
        'cancelledFromEscalationId', ${context.escalationId}::text, 'resolvedAt', ${resolvedAt}::timestamptz)
    FROM cancelled
  `);
  await transaction
    .update(workflowTasks)
    .set({
      assignedUserId: context.sourceAssignedUserId,
      assignedRoleId: context.sourceAssignedRoleId,
      status: "PENDING",
      startedAt: null,
      completedAt: null,
      claimedAt: resolvedAt,
      rowVersion: context.rowVersion + 1,
    })
    .where(eq(workflowTasks.id, input.taskId));
  // Preserve drafts, form responses and evidence; only responsibility changes.
  await transaction.execute(sql`
    UPDATE app_workflow_stage_instances
    SET row_version = row_version + 1 WHERE id = ${context.stageInstanceId}::uuid
  `);
  const common = {
    actorId: input.actorId,
    correlationId: input.correlationId,
    stageInstanceId: context.stageInstanceId,
    taskId: input.taskId,
    workflowInstanceId: context.workflowInstanceId,
  };
  await appendControlRecords(transaction, {
    ...common,
    action: "TASK_REASSIGNED",
    targetId: input.taskId,
    targetType: "WORKFLOW_TASK",
    before: {
      assignedUserId: context.assignedUserId,
      assignedRoleId: context.assignedRoleId,
      status: context.taskStatus,
    },
    after: {
      assignedUserId: context.sourceAssignedUserId,
      assignedRoleId: context.sourceAssignedRoleId,
      assignmentStatus: "REASSIGNED",
      status: "PENDING",
      escalationId: context.escalationId,
      reason: "ESCALATION_CANCELLED",
    },
  });
  return {
    taskId: input.taskId,
    taskStatus: "PENDING" as const,
    rowVersion: context.rowVersion + 1,
  };
}
