import "server-only";

import { eq, sql } from "drizzle-orm";

import { workflowEscalations } from "./workflow-control.schema";
import { workflowTasks } from "./workflow-runtime.schema";
import type { EscalateConfiguration } from "../domain/actions/WorkflowActionConfiguration";
import type { WorkflowActionExecutionTransaction } from "./WorkflowActionExecutionRepository";
import { appendControlRecords } from "./WorkflowControlRepository";

type Transaction = WorkflowActionExecutionTransaction;

export async function startWorkflowEscalation(
  transaction: Transaction,
  input: {
    actionExecutionId: string;
    actorId: string;
    assignedUserId: string;
    comment?: string;
    configuration: EscalateConfiguration;
    correlationId: string;
    reason?: string;
    stageInstanceId: string;
    taskId: string;
    workflowInstanceId: string;
    triggerOverride?: "RFI_EXPIRY";
  },
) {
  const [task] = await transaction
    .select({
      assignedRoleId: workflowTasks.assignedRoleId,
      assignedUserId: workflowTasks.assignedUserId,
      status: workflowTasks.status,
    })
    .from(workflowTasks)
    .where(eq(workflowTasks.id, input.taskId))
    .limit(1);
  if (!task) return null;
  const parent = await transaction.execute<{ id: string }>(sql`
    SELECT escalation.id FROM app_workflow_escalations escalation
    WHERE escalation.task_id = ${input.taskId}::uuid AND escalation.status = 'ACTIVE'
      AND NOT EXISTS (
        SELECT 1 FROM app_workflow_escalations child
        WHERE child.parent_escalation_id = escalation.id AND child.status = 'ACTIVE'
      )
    ORDER BY escalation.escalated_at DESC, escalation.id DESC LIMIT 1
  `);
  const [escalation] = await transaction
    .insert(workflowEscalations)
    .values({
      parentEscalationId: parent.rows[0]?.id ?? null,
      actionExecutionId: input.actionExecutionId,
      blockUntilResolved: input.configuration.blockUntilResolved,
      comment: input.comment,
      escalatedBy: input.actorId,
      reason: input.reason,
      responsibility: input.configuration.responsibility,
      sourceAssignedRoleId: task.assignedRoleId,
      sourceAssignedUserId: task.assignedUserId,
      stageInstanceId: input.stageInstanceId,
      targetRoleId:
        input.configuration.targetType === "ROLE"
          ? input.configuration.targetId
          : null,
      targetType: input.configuration.targetType,
      targetUserId:
        input.configuration.targetType === "USER"
          ? input.configuration.targetId
          : null,
      taskId: input.taskId,
      trigger: input.triggerOverride ?? input.configuration.trigger,
      workflowInstanceId: input.workflowInstanceId,
    })
    .returning({ id: workflowEscalations.id });
  await transaction
    .update(workflowTasks)
    .set({
      assignedRoleId:
        input.configuration.targetType === "ROLE"
          ? input.configuration.targetId
          : null,
      assignedUserId: input.assignedUserId,
      claimedAt: new Date(),
      completedAt: null,
      startedAt: null,
      status: "PENDING",
      rowVersion: sql`${workflowTasks.rowVersion} + 1`,
    })
    .where(eq(workflowTasks.id, input.taskId));
  await appendControlRecords(transaction, {
    action: "TASK_REASSIGNED",
    actorId: input.actorId,
    after: {
      assignedRoleId:
        input.configuration.targetType === "ROLE"
          ? input.configuration.targetId
          : null,
      assignedUserId: input.assignedUserId,
      escalationId: escalation.id,
      assignmentStatus: "REASSIGNED",
      status: "PENDING",
    },
    before: {
      assignedRoleId: task.assignedRoleId,
      assignedUserId: task.assignedUserId,
      status: task.status,
    },
    correlationId: input.correlationId,
    stageInstanceId: input.stageInstanceId,
    targetId: input.taskId,
    targetType: "WORKFLOW_TASK",
    taskId: input.taskId,
    workflowInstanceId: input.workflowInstanceId,
  });
  await appendControlRecords(transaction, {
    action: "WORKFLOW_ESCALATION_STARTED",
    actorId: input.actorId,
    after: {
      blockUntilResolved: input.configuration.blockUntilResolved,
      responsibility: input.configuration.responsibility,
      targetId: input.configuration.targetId,
      targetType: input.configuration.targetType,
      trigger: input.triggerOverride ?? input.configuration.trigger,
    },
    before: {
      assignedRoleId: task.assignedRoleId,
      assignedUserId: task.assignedUserId,
    },
    correlationId: input.correlationId,
    stageInstanceId: input.stageInstanceId,
    targetId: escalation.id,
    targetType: "WORKFLOW_ESCALATION",
    taskId: input.taskId,
    workflowInstanceId: input.workflowInstanceId,
  });
  return escalation;
}

export async function resolveActiveWorkflowEscalation(
  transaction: Transaction,
  input: {
    actorId: string;
    correlationId: string;
    resolutionActionExecutionId: string;
    stageInstanceId: string;
    taskId: string;
    workflowInstanceId: string;
  },
) {
  const result = await transaction.execute<{ id: string }>(sql`
    WITH resolved AS (
      UPDATE app_workflow_escalations
      SET status = 'RESOLVED', resolved_by = ${input.actorId}::uuid, resolved_at = now(),
        resolution_action_execution_id = ${input.resolutionActionExecutionId}::uuid
      WHERE task_id = ${input.taskId}::uuid AND status = 'ACTIVE'
      RETURNING id
    ), events AS (
      INSERT INTO app_workflow_events (workflow_instance_id, event_code, actor_id, correlation_id, payload)
      SELECT ${input.workflowInstanceId}::uuid, 'WORKFLOW_ESCALATION_RESOLVED',
        ${input.actorId}::uuid, ${input.correlationId}::uuid,
        jsonb_build_object('escalationId', id, 'status', 'RESOLVED',
          'resolutionActionExecutionId', ${input.resolutionActionExecutionId}::text)
      FROM resolved
    )
    INSERT INTO app_workflow_audit_entries (
      actor_id, action, target_type, target_id, correlation_id, workflow_instance_id,
      stage_instance_id, task_id, after
    )
    SELECT ${input.actorId}::uuid, 'WORKFLOW_ESCALATION_RESOLVED', 'WORKFLOW_ESCALATION',
      id::text, ${input.correlationId}::uuid, ${input.workflowInstanceId}::uuid,
      ${input.stageInstanceId}::uuid, ${input.taskId}::uuid,
      jsonb_build_object('status', 'RESOLVED', 'resolutionActionExecutionId', ${input.resolutionActionExecutionId}::text)
    FROM resolved RETURNING target_id AS id
  `);
  return result.rows[0] ?? null;
}

export async function resolveCompletedTaskEscalation(
  transaction: Transaction,
  input: { actorId: string; correlationId: string; taskId: string },
) {
  // Completion has already been authorized and persisted in this transaction.
  // Historical ownership cannot resolve the current assignee's escalation.
  await transaction.execute(sql`
    WITH resolved AS (
      UPDATE app_workflow_escalations escalation
      SET status = 'RESOLVED', resolved_by = ${input.actorId}::uuid, resolved_at = now()
      FROM app_workflow_tasks task
      WHERE escalation.task_id = task.id
        AND task.id = ${input.taskId}::uuid
        AND task.assigned_user_id = ${input.actorId}::uuid
        AND task.status = 'COMPLETED'
        AND escalation.status = 'ACTIVE'
      RETURNING escalation.id, escalation.workflow_instance_id,
        escalation.stage_instance_id, escalation.task_id, escalation.resolved_at
    ), events AS (
      INSERT INTO app_workflow_events (
        workflow_instance_id, event_code, actor_id, correlation_id, payload
      )
      SELECT workflow_instance_id, 'WORKFLOW_ESCALATION_RESOLVED',
        ${input.actorId}::uuid, ${input.correlationId}::uuid,
        jsonb_build_object('escalationId', id, 'status', 'RESOLVED',
          'resolvedAt', resolved_at, 'resolutionTaskStatus', 'COMPLETED')
      FROM resolved
    )
    INSERT INTO app_workflow_audit_entries (
      actor_id, action, target_type, target_id, correlation_id,
      workflow_instance_id, stage_instance_id, task_id, after
    )
    SELECT ${input.actorId}::uuid, 'WORKFLOW_ESCALATION_RESOLVED',
      'WORKFLOW_ESCALATION', id::text, ${input.correlationId}::uuid,
      workflow_instance_id, stage_instance_id, task_id,
      jsonb_build_object('status', 'RESOLVED', 'resolvedAt', resolved_at,
        'resolutionTaskStatus', 'COMPLETED')
    FROM resolved
  `);
}
