import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { systemSeedUserId } from "@/platform/database/SystemSeedPrincipal";
import type { WorkflowActionDefinition, WorkflowActionType } from "../domain/actions/WorkflowActionDefinition";
import type { WorkflowDeadlineCandidate } from "../domain/runtime/WorkflowDeadline";
import type { WorkflowActionExecutionTransaction } from "./WorkflowActionExecutionRepository";
import { stageInstances, workflowActionExecutions, workflowTasks } from "./workflow-runtime.schema";
import { workflowRfis } from "./workflow-rfi.schema";
import { appendControlRecords } from "./WorkflowControlRepository";
import { appendWorkflowRfiLifecycleRecords } from "./WorkflowRfiLifecycleRecordsRepository";

export async function lockDeadlineTask(
  transaction: WorkflowActionExecutionTransaction,
  candidate: WorkflowDeadlineCandidate,
) {
  if (!candidate.taskId) return true;
  const [task] = await transaction.select({ id: workflowTasks.id })
    .from(workflowTasks).where(and(
      eq(workflowTasks.id, candidate.taskId),
      eq(workflowTasks.stageInstanceId, candidate.stageInstanceId),
      sql`${workflowTasks.status} IN ('PENDING', 'IN_PROGRESS')`,
    )).for("update").limit(1);
  return Boolean(task);
}

export async function hasActiveDeadlineEscalation(
  transaction: WorkflowActionExecutionTransaction,
  taskId: string | null,
) {
  const result = await transaction.execute<{ active: boolean }>(sql`
    SELECT EXISTS (SELECT 1 FROM app_workflow_escalations
      WHERE task_id = ${taskId}::uuid AND status = 'ACTIVE') AS active
  `);
  return result.rows[0]?.active === true;
}

export async function loadBoundDeadlineActions(
  transaction: WorkflowActionExecutionTransaction,
  candidate: WorkflowDeadlineCandidate,
  actionType: WorkflowActionType,
) {
  const result = await transaction.execute<WorkflowActionDefinition & { id: string }>(sql`
    SELECT action.id, action.stable_key AS "stableKey", action.label,
      action.action_type AS "actionType", action.enabled,
      action.display_order AS "displayOrder", action.reason_required AS "reasonRequired",
      action.configuration, action.condition
    FROM app_workflow_action_definitions action
    JOIN app_workflow_stage_instances stage ON stage.workflow_stage_definition_id = action.stage_id
    JOIN app_workflow_tasks task ON task.stage_instance_id = stage.id
    JOIN app_stage_task_action_bindings binding ON binding.stage_id = action.stage_id
      AND binding.task_definition_id = task.workflow_task_definition_id
      AND binding.action_key = action.stable_key
    WHERE stage.id = ${candidate.stageInstanceId}::uuid
      AND task.id = ${candidate.taskId}::uuid
      AND action.enabled AND action.action_type = ${actionType}
      AND (${candidate.kind} <> 'SLA_BREACH' OR action.configuration ->> 'trigger' = 'SLA_BREACH')
    ORDER BY action.display_order, action.id
    LIMIT 2
  `);
  return result.rows;
}

export async function lockDeadlineRfi(
  transaction: WorkflowActionExecutionTransaction,
  candidate: WorkflowDeadlineCandidate,
) {
  const [rfi] = await transaction.select({
    deadlineAt: workflowRfis.deadlineAt,
    expiryAction: workflowRfis.expiryAction,
    question: workflowRfis.question,
  }).from(workflowRfis).where(and(
    eq(workflowRfis.id, candidate.sourceId),
    eq(workflowRfis.workflowInstanceId, candidate.workflowInstanceId),
    eq(workflowRfis.stageInstanceId, candidate.stageInstanceId),
    eq(workflowRfis.status, "OPEN"),
  )).for("update").limit(1);
  if (!rfi) throw new Error("The scheduled information request is no longer open.");
  return rfi;
}

export async function recordScheduledWorkflowAction(
  transaction: WorkflowActionExecutionTransaction,
  input: {
    action: WorkflowActionDefinition & { id: string };
    candidate: WorkflowDeadlineCandidate;
    conditionEvaluation: Record<string, unknown>;
    correlationId: string;
    executionId: string;
    occurredAt: Date;
    rowVersion: number;
    targetStageInstanceId?: string;
  },
) {
  const { candidate } = input;
  await transaction.insert(workflowActionExecutions).values({
    id: input.executionId,
    actionDefinitionId: input.action.id,
    actionKey: input.action.stableKey,
    actionType: input.action.actionType,
    actorType: "SYSTEM",
    actorId: null,
    actorIdentifier: "workflow-deadline-processor",
    workflowInstanceId: candidate.workflowInstanceId,
    sourceStageInstanceId: candidate.stageInstanceId,
    taskId: candidate.taskId,
    comment: `Scheduled ${candidate.kind}`,
    reason: `Scheduled ${candidate.kind}`,
    normalizedInput: {
      actionType: input.action.actionType,
      comment: `Scheduled ${candidate.kind}`,
      reason: `Scheduled ${candidate.kind}`,
    },
    resolvedTarget: { targetStageInstanceId: input.targetStageInstanceId ?? null },
    conditionEvaluation: input.conditionEvaluation,
    expectedRuntimeVersion: input.rowVersion,
    resultingRuntimeVersion: input.rowVersion + 1,
    result: { kind: candidate.kind, executedAt: input.occurredAt.toISOString() },
    idempotencyKey: `action:${candidate.occurrenceKey}`,
    correlationId: input.correlationId,
    executedAt: input.occurredAt,
  });
}

export async function cancelSourceForScheduledReturn(
  transaction: WorkflowActionExecutionTransaction,
  candidate: WorkflowDeadlineCandidate,
  occurredAt: Date,
  correlationId: string,
) {
  const closedRequests = await transaction.update(workflowRfis).set({
    status: "CLOSED",
    closedAt: occurredAt,
    continuationAppliedAt: occurredAt,
    updatedAt: occurredAt,
    rowVersion: sql`${workflowRfis.rowVersion} + 1`,
  }).where(and(
    eq(workflowRfis.stageInstanceId, candidate.stageInstanceId),
    eq(workflowRfis.status, "OPEN"),
  )).returning({
    actionDefinitionId: workflowRfis.actionDefinitionId,
    applicationId: workflowRfis.applicationId,
    id: workflowRfis.id,
    rowVersion: workflowRfis.rowVersion,
    taskId: workflowRfis.taskId,
  });
  for (const request of closedRequests) {
    await appendWorkflowRfiLifecycleRecords(transaction, {
      actorId: systemSeedUserId,
      actorType: "SYSTEM",
      correlationId,
      details: { reason: "Source stage returned after another RFI expired." },
      fromStatus: "OPEN",
      nextRowVersion: request.rowVersion,
      occurredAt,
      previousRowVersion: request.rowVersion - 1,
      requestInformationId: request.id,
      source: {
        actionDefinitionId: request.actionDefinitionId,
        applicationId: request.applicationId,
        stageInstanceId: candidate.stageInstanceId,
        taskId: request.taskId,
        workflowInstanceId: candidate.workflowInstanceId,
      },
      toStatus: "CLOSED",
    });
  }
  // A deadline return creates rework; it does not claim unfinished tasks passed.
  await transaction.update(workflowTasks).set({
    status: "CANCELLED",
    completedAt: occurredAt,
    rowVersion: sql`${workflowTasks.rowVersion} + 1`,
  }).where(and(
    eq(workflowTasks.stageInstanceId, candidate.stageInstanceId),
    sql`${workflowTasks.status} IN ('PENDING', 'IN_PROGRESS')`,
  ));
  await transaction.update(stageInstances).set({
    status: "CANCELLED",
    completedAt: occurredAt,
  }).where(eq(stageInstances.id, candidate.stageInstanceId));
}

export async function appendWorkflowDeadlineAudit(
  transaction: WorkflowActionExecutionTransaction,
  candidate: WorkflowDeadlineCandidate,
  correlationId: string,
  occurredAt: Date,
) {
  await appendControlRecords(transaction, {
    action: `WORKFLOW_${candidate.kind}`,
    actorId: systemSeedUserId,
    after: {
      actorType: "SYSTEM",
      occurrenceKey: candidate.occurrenceKey,
      occurredAt: occurredAt.toISOString(),
      scheduledFor: new Date(candidate.scheduledFor).toISOString(),
    },
    correlationId,
    stageInstanceId: candidate.stageInstanceId,
    targetId: candidate.sourceId,
    targetType: "WORKFLOW_DEADLINE",
    taskId: candidate.taskId,
    workflowInstanceId: candidate.workflowInstanceId,
  });
}
