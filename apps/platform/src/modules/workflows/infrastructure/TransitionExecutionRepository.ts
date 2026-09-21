import "server-only";

import { eq, sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
import type { StageConditionEvaluation } from "../engine/StageCondition";
import type { TransitionExecutionOutcome } from "../domain/runtime/TransitionExecution";
import {
  transitionExecutions,
  workflowAuditEntries,
  workflowEvents,
  workflowInstances,
} from "@/db/schema";
import type { StageCompletionTransaction } from "./StageCompletionRepository";

export type SequentialTransition = {
  condition: ConditionGroup | null;
  id: string;
  priority: number;
  targetStageDefinitionId: string | null;
  targetStageName: string | null;
  terminalOutcome: string | null;
};

export type ExistingTransitionExecution = {
  actionKey: string;
  executionId: string;
  outcome: TransitionExecutionOutcome;
  targetStageInstanceId: string | null;
  targetStageName: string | null;
  workflowStatus: "ACTIVE" | "COMPLETED" | "CANCELLED";
};

type TransitionRow = SequentialTransition & { actionId: string };

export function withTransitionExecutionTransaction<T>(
  work: (transaction: StageCompletionTransaction) => Promise<T>,
) {
  return getDatabase().transaction(work);
}

export async function findTransitionExecution(
  transaction: StageCompletionTransaction,
  sourceStageInstanceId: string,
): Promise<ExistingTransitionExecution | null> {
  const result = await transaction.execute(sql`
    SELECT execution.id AS "executionId",
      execution.action_key AS "actionKey",
      execution.outcome,
      execution.target_stage_instance_id AS "targetStageInstanceId",
      target.name AS "targetStageName",
      workflow.status AS "workflowStatus"
    FROM app_workflow_transition_executions execution
    JOIN app_workflow_instances workflow
      ON workflow.id = execution.workflow_instance_id
    LEFT JOIN app_workflow_stage_definitions target
      ON target.id = execution.target_stage_definition_id
    WHERE execution.source_stage_instance_id = ${sourceStageInstanceId}::uuid
    LIMIT 1
  `);
  return (result.rows[0] as ExistingTransitionExecution | undefined) ?? null;
}

export async function loadSequentialTransitions(
  transaction: StageCompletionTransaction,
  input: {
    actionKey: string;
    sourceStageDefinitionId: string;
    workflowVersionId: string;
  },
): Promise<{ actionExists: boolean; transitions: SequentialTransition[] }> {
  const result = await transaction.execute(sql`
    SELECT action.id AS "actionId", transition.id,
      transition.priority, transition.condition,
      transition.to_stage_id AS "targetStageDefinitionId",
      transition.terminal_outcome AS "terminalOutcome",
      target.name AS "targetStageName"
    FROM app_workflow_action_definitions action
    LEFT JOIN app_workflow_transition_definitions transition
      ON transition.version_id = ${input.workflowVersionId}::uuid
      AND transition.from_stage_id = action.stage_id
      AND transition.action_key = action.stable_key
    LEFT JOIN app_workflow_stage_definitions target
      ON target.id = transition.to_stage_id
    WHERE action.stage_id = ${input.sourceStageDefinitionId}::uuid
      AND action.stable_key = ${input.actionKey}
      AND action.enabled = TRUE
    ORDER BY transition.priority ASC, transition.id ASC
  `);
  const rows = result.rows as Array<TransitionRow & { id: string | null }>;
  return {
    actionExists: rows.length > 0,
    transitions: rows.filter(
      (row): row is TransitionRow => row.id !== null,
    ).map((row) => ({
      condition: row.condition,
      id: row.id,
      priority: row.priority,
      targetStageDefinitionId: row.targetStageDefinitionId,
      targetStageName: row.targetStageName,
      terminalOutcome: row.terminalOutcome,
    })),
  };
}

export async function recordTransitionExecution(
  transaction: StageCompletionTransaction,
  input: {
    actionKey: string;
    actorId: string;
    conditionEvaluation: StageConditionEvaluation;
    correlationId: string;
    sourceStageInstanceId: string;
    transition: SequentialTransition;
    workflowInstanceId: string;
  },
) {
  const [execution] = await transaction.insert(transitionExecutions).values({
    actionKey: input.actionKey,
    actorId: input.actorId,
    conditionEvaluation: input.conditionEvaluation as unknown as Record<
      string,
      unknown
    >,
    correlationId: input.correlationId,
    sourceStageInstanceId: input.sourceStageInstanceId,
    targetStageDefinitionId: input.transition.targetStageDefinitionId,
    transitionDefinitionId: input.transition.id,
    workflowInstanceId: input.workflowInstanceId,
  }).returning({ id: transitionExecutions.id });
  return execution;
}

export async function completeTerminalWorkflow(
  transaction: StageCompletionTransaction,
  workflowInstanceId: string,
  completedAt: Date,
) {
  await transaction.update(workflowInstances).set({
    completedAt,
    status: "COMPLETED",
  }).where(eq(workflowInstances.id, workflowInstanceId));
}

export async function finalizeTransitionExecution(
  transaction: StageCompletionTransaction,
  input: {
    actionKey: string;
    actorId: string;
    correlationId: string;
    executionId: string;
    outcome: Exclude<TransitionExecutionOutcome, "RECORDED">;
    sourceStageInstanceId: string;
    targetStageInstanceId: string | null;
    transition: SequentialTransition;
    workflowInstanceId: string;
  },
) {
  await transaction.update(transitionExecutions).set({
    outcome: input.outcome,
    targetStageInstanceId: input.targetStageInstanceId,
  }).where(eq(transitionExecutions.id, input.executionId));
  const payload = {
    actionKey: input.actionKey,
    outcome: input.outcome,
    sourceStageInstanceId: input.sourceStageInstanceId,
    targetStageDefinitionId: input.transition.targetStageDefinitionId,
    targetStageInstanceId: input.targetStageInstanceId,
    terminalOutcome: input.transition.terminalOutcome,
    transitionDefinitionId: input.transition.id,
  };
  await transaction.insert(workflowEvents).values({
    actorId: input.actorId,
    correlationId: input.correlationId,
    eventCode: "TRANSITION_EXECUTED",
    payload,
    workflowInstanceId: input.workflowInstanceId,
  });
  await transaction.insert(workflowAuditEntries).values({
    action: "TRANSITION_EXECUTED",
    actorId: input.actorId,
    after: payload,
    before: null,
    correlationId: input.correlationId,
    stageInstanceId: input.sourceStageInstanceId,
    targetId: input.executionId,
    targetType: "WORKFLOW_TRANSITION_EXECUTION",
    workflowInstanceId: input.workflowInstanceId,
  });
}
