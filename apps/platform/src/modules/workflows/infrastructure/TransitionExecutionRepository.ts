import "server-only";

import { eq, sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import type { TerminalApplicantStatus } from "../domain/transitions/WorkflowTerminalOutcome";
import type { WorkflowPublicStatusMapping } from "../domain/definitions/WorkflowStageDefinition";
import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
import type { StageConditionEvaluation } from "../engine/StageCondition";
import type { TransitionExecutionOutcome } from "../domain/runtime/TransitionExecution";
import {
  transitionExecutions,
  transitionExecutionTargets,
  workflowAuditEntries,
  workflowEvents,
} from "@/db/schema";
import type { StageCompletionTransaction } from "./StageCompletionRepository";

export type SequentialTransitionTarget = {
  id: string;
  name: string;
};

export type SequentialTransition = {
  condition: ConditionGroup | null;
  id: string;
  priority: number;
  targetStages: SequentialTransitionTarget[];
  terminalOutcome: string | null;
  terminalApplicantStatus?: TerminalApplicantStatus | null;
};

export type TransitionTargetOutcome = {
  incompletePredecessorStageKeys?: string[];
  outcome:
    "ACTIVATED" | "ALREADY_ACTIVE" | "ENTRY_CONDITION_FAILED" | "JOIN_PENDING";
  targetStageDefinitionId: string;
  targetStageInstanceId: string | null;
  targetStageName: string;
};

export type ExistingTransitionExecution = {
  actionKey: string;
  executionId: string;
  outcome: TransitionExecutionOutcome;
  targets: TransitionTargetOutcome[];
  workflowStatus: "ACTIVE" | "COMPLETED" | "CANCELLED";
};

type TransitionRow = Omit<SequentialTransition, "targetStages"> & {
  actionId: string;
  targetStages: SequentialTransitionTarget[] | null;
};

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
      workflow.status AS "workflowStatus",
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'outcome', target.outcome,
          'targetStageDefinitionId', target.target_stage_definition_id,
          'targetStageInstanceId', target.target_stage_instance_id,
          'targetStageName', definition.name
        ) ORDER BY definition.sequence, definition.id)
        FROM app_workflow_transition_execution_targets target
        JOIN app_workflow_stage_definitions definition
          ON definition.id = target.target_stage_definition_id
        WHERE target.execution_id = execution.id
      ), '[]'::jsonb) AS targets
    FROM app_workflow_transition_executions execution
    JOIN app_workflow_instances workflow
      ON workflow.id = execution.workflow_instance_id
    WHERE execution.source_stage_instance_id = ${sourceStageInstanceId}::uuid
    LIMIT 1
  `);
  return (result.rows[0] as ExistingTransitionExecution | undefined) ?? null;
}

export async function loadSequentialTransitions(
  transaction: Pick<StageCompletionTransaction, "execute">,
  input: {
    actionKey: string;
    sourceStageDefinitionId: string;
    workflowVersionId: string;
  },
): Promise<{ actionExists: boolean; transitions: SequentialTransition[] }> {
  const result = await transaction.execute(sql`
    SELECT action.id AS "actionId", transition.id,
      transition.priority, transition.condition,
      transition.terminal_outcome AS "terminalOutcome",
      transition.terminal_applicant_status AS "terminalApplicantStatus",
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', target.target_stage_id,
          'name', stage.name
        ) ORDER BY stage.sequence, stage.id)
        FROM app_workflow_transition_targets target
        JOIN app_workflow_stage_definitions stage
          ON stage.id = target.target_stage_id
        WHERE target.transition_id = transition.id
      ), '[]'::jsonb) AS "targetStages"
    FROM app_workflow_action_definitions action
    LEFT JOIN app_workflow_transition_definitions transition
      ON transition.version_id = ${input.workflowVersionId}::uuid
      AND transition.from_stage_id = action.stage_id
      AND transition.action_key = action.stable_key
    WHERE action.stage_id = ${input.sourceStageDefinitionId}::uuid
      AND action.stable_key = ${input.actionKey}
    ORDER BY transition.priority ASC, transition.id ASC
  `);
  const rows = result.rows as Array<TransitionRow & { id: string | null }>;
  return {
    actionExists: rows.length > 0,
    transitions: rows
      .filter((row): row is TransitionRow => row.id !== null)
      .map((row) => ({
        condition: row.condition,
        id: row.id,
        priority: row.priority,
        targetStages: row.targetStages ?? [],
        terminalOutcome: row.terminalOutcome,
        terminalApplicantStatus: row.terminalApplicantStatus,
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
  const [execution] = await transaction
    .insert(transitionExecutions)
    .values({
      actionKey: input.actionKey,
      actorId: input.actorId,
      conditionEvaluation: input.conditionEvaluation as unknown as Record<
        string,
        unknown
      >,
      correlationId: input.correlationId,
      sourceStageInstanceId: input.sourceStageInstanceId,
      transitionDefinitionId: input.transition.id,
      workflowInstanceId: input.workflowInstanceId,
    })
    .returning({ id: transitionExecutions.id });
  return execution;
}

export async function completeTerminalWorkflow(
  transaction: StageCompletionTransaction,
  workflowInstanceId: string,
  completedAt: Date,
  terminalOutcome: string,
  publicStatus: WorkflowPublicStatusMapping,
) {
  const result = await transaction.execute(sql`
    UPDATE app_workflow_instances workflow
    SET completed_at = ${completedAt}, status = 'COMPLETED',
      terminal_outcome = ${terminalOutcome},
      public_status = ${JSON.stringify(publicStatus)}::jsonb
    WHERE workflow.id = ${workflowInstanceId}::uuid
      AND NOT EXISTS (
        SELECT 1
        FROM app_workflow_stage_instances stage
        WHERE stage.workflow_instance_id = workflow.id
          AND stage.status = 'ACTIVE'
      )
    RETURNING workflow.id
  `);
  return result.rows.length > 0;
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
    targets: TransitionTargetOutcome[];
    transition: SequentialTransition;
    workflowInstanceId: string;
  },
) {
  await transaction
    .update(transitionExecutions)
    .set({
      outcome: input.outcome,
    })
    .where(eq(transitionExecutions.id, input.executionId));
  if (input.targets.length) {
    await transaction.insert(transitionExecutionTargets).values(
      input.targets.map((target) => ({
        executionId: input.executionId,
        outcome: target.outcome,
        targetStageDefinitionId: target.targetStageDefinitionId,
        targetStageInstanceId: target.targetStageInstanceId,
      })),
    );
  }
  const payload = {
    actionKey: input.actionKey,
    outcome: input.outcome,
    sourceStageInstanceId: input.sourceStageInstanceId,
    targets: input.targets,
    terminalOutcome: input.transition.terminalOutcome,
    terminalApplicantStatus: input.transition.terminalApplicantStatus ?? null,
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
