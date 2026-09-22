import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  stageInstances,
  stageTaskActionBindings,
  stageTaskDefinitions,
  workflowActionDefinitions,
  workflowActionExecutions,
  workflowAuditEntries,
  workflowEvents,
  workflowTasks,
} from "@/db/schema";
import type { WorkflowActionDefinition } from "../domain/actions/WorkflowActionDefinition";
import type {
  WorkflowActionExecutionResult,
  WorkflowActionInput,
} from "../domain/actions/WorkflowActionExecution";
import type { WorkflowElementPermissions } from "../domain/definitions/WorkflowElementPermissions";
import type { StageCompletionTarget } from "./StageCompletionRepository";
import {
  lockStageCompletionTarget,
  type StageCompletionTransaction,
} from "./StageCompletionRepository";

export type WorkflowActionExecutionTransaction = StageCompletionTransaction;

export type WorkflowActionExecutionTarget = {
  action: WorkflowActionDefinition & { id: string };
  stage: StageCompletionTarget & { rowVersion: number };
  task: {
    assignedToActor: boolean;
    id: string;
    permissions: WorkflowElementPermissions;
    rowVersion: number;
    status: string;
  } | null;
};

type ReplayCommand = {
  actionKey: string;
  actorId: string;
  expectedRuntimeVersion: number;
  input: WorkflowActionInput;
  sourceStageInstanceId: string;
  taskId?: string;
  workflowInstanceId: string;
};

export type ActionExecutionReplay = {
  matchesCommand: boolean;
  result: WorkflowActionExecutionResult;
};

export function withWorkflowActionExecutionTransaction<T>(
  work: (transaction: WorkflowActionExecutionTransaction) => Promise<T>,
) {
  return getDatabase().transaction(work);
}

export async function findWorkflowActionExecution(
  executor: Pick<ReturnType<typeof getDatabase>, "execute">,
  idempotencyKey: string,
  command: ReplayCommand,
): Promise<ActionExecutionReplay | null> {
  const found = await executor.execute(sql`
    SELECT result,
      action_key = ${command.actionKey} AS "sameAction",
      actor_id = ${command.actorId}::uuid AS "sameActor",
      expected_runtime_version = ${command.expectedRuntimeVersion}
        AS "sameVersion",
      normalized_input = ${JSON.stringify(command.input)}::jsonb AS "sameInput",
      source_stage_instance_id = ${command.sourceStageInstanceId}::uuid
        AS "sameStage",
      workflow_instance_id = ${command.workflowInstanceId}::uuid
        AS "sameWorkflow",
      task_id IS NOT DISTINCT FROM ${command.taskId ?? null}::uuid AS "sameTask"
    FROM app_workflow_action_executions
    WHERE idempotency_key = ${idempotencyKey}
    LIMIT 1
  `);
  const row = found.rows[0] as ({
    result: WorkflowActionExecutionResult;
    sameAction: boolean;
    sameActor: boolean;
    sameInput: boolean;
    sameStage: boolean;
    sameTask: boolean;
    sameVersion: boolean;
    sameWorkflow: boolean;
  } | undefined);
  if (!row) return null;
  return {
    matchesCommand: row.sameAction
      && row.sameActor
      && row.sameInput
      && row.sameStage
      && row.sameTask
      && row.sameVersion
      && row.sameWorkflow,
    result: row.result,
  };
}

async function lockTask(
  transaction: WorkflowActionExecutionTransaction,
  input: {
    actionKey: string;
    actorId: string;
    stageDefinitionId: string;
    stageInstanceId: string;
    taskId: string;
  },
) {
  const [task] = await transaction
    .select({
      assignedToActor: sql<boolean>`(
        ${workflowTasks.assignedUserId} = ${input.actorId}::uuid
        OR (
          ${workflowTasks.assignedUserId} IS NULL
          AND EXISTS (
            SELECT 1 FROM app_user_roles actor_role
            WHERE actor_role.user_id = ${input.actorId}::uuid
              AND actor_role.role_id = ${workflowTasks.assignedRoleId}
          )
        )
      )`,
      id: workflowTasks.id,
      permissions: stageTaskDefinitions.permissions,
      rowVersion: workflowTasks.rowVersion,
      status: workflowTasks.status,
    })
    .from(workflowTasks)
    .innerJoin(
      stageTaskDefinitions,
      eq(stageTaskDefinitions.id, workflowTasks.workflowTaskDefinitionId),
    )
    .innerJoin(
      stageTaskActionBindings,
      and(
        eq(
          stageTaskActionBindings.taskDefinitionId,
          workflowTasks.workflowTaskDefinitionId,
        ),
        eq(stageTaskActionBindings.stageId, input.stageDefinitionId),
        eq(stageTaskActionBindings.actionKey, input.actionKey),
      ),
    )
    .where(and(
      eq(workflowTasks.id, input.taskId),
      eq(workflowTasks.stageInstanceId, input.stageInstanceId),
    ))
    .for("update", { of: workflowTasks })
    .limit(1);
  return task ?? null;
}

export async function lockWorkflowActionExecutionTarget(
  transaction: WorkflowActionExecutionTransaction,
  input: {
    actionKey: string;
    actorId: string;
    sourceStageInstanceId: string;
    taskId?: string;
  },
): Promise<WorkflowActionExecutionTarget | null> {
  const stage = await lockStageCompletionTarget(
    transaction,
    input.sourceStageInstanceId,
  );
  if (!stage) return null;
  const [action] = await transaction
    .select()
    .from(workflowActionDefinitions)
    .where(and(
      eq(workflowActionDefinitions.stageId, stage.stageDefinitionId),
      eq(workflowActionDefinitions.stableKey, input.actionKey),
      eq(workflowActionDefinitions.enabled, true),
    ))
    .limit(1);
  if (!action) return null;
  const task = input.taskId
    ? await lockTask(transaction, {
        actionKey: input.actionKey,
        actorId: input.actorId,
        stageDefinitionId: stage.stageDefinitionId,
        stageInstanceId: stage.stageInstanceId,
        taskId: input.taskId,
      })
    : null;
  if (input.taskId && !task) return null;
  return {
    action: {
      actionType: action.actionType,
      condition: action.condition,
      configuration: action.configuration,
      displayOrder: action.displayOrder,
      enabled: action.enabled,
      id: action.id,
      label: action.label,
      reasonCodeRequired: action.reasonCodeRequired,
      stableKey: action.stableKey,
    } as WorkflowActionDefinition & { id: string },
    stage: stage as StageCompletionTarget & { rowVersion: number },
    task,
  };
}

export async function claimWorkflowActionRuntimeVersion(
  transaction: WorkflowActionExecutionTransaction,
  stageInstanceId: string,
  expectedRuntimeVersion: number,
) {
  const [stage] = await transaction
    .update(stageInstances)
    .set({ rowVersion: expectedRuntimeVersion + 1 })
    .where(and(
      eq(stageInstances.id, stageInstanceId),
      eq(stageInstances.rowVersion, expectedRuntimeVersion),
      eq(stageInstances.status, "ACTIVE"),
    ))
    .returning({ rowVersion: stageInstances.rowVersion });
  return stage?.rowVersion ?? null;
}

export async function configuredActionTargetsAreValid(
  transaction: WorkflowActionExecutionTransaction,
  target: WorkflowActionExecutionTarget,
) {
  const configuration = JSON.stringify(target.action.configuration);
  const checked = await transaction.execute(sql`
    SELECT
      CASE ${target.action.actionType}::text
        WHEN 'ESCALATE' THEN CASE ${configuration}::jsonb->>'targetType'
          WHEN 'ROLE' THEN EXISTS (
            SELECT 1 FROM app_roles
            WHERE id = (${configuration}::jsonb->>'targetId')::uuid
          )
          WHEN 'USER' THEN EXISTS (
            SELECT 1 FROM app_users
            WHERE id = (${configuration}::jsonb->>'targetId')::uuid
              AND status = 'active'
          )
          ELSE FALSE
        END
        WHEN 'WITHDRAW' THEN NOT EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(
            ${configuration}::jsonb->'allowedStageKeys'
          ) configured(stage_key)
          WHERE NOT EXISTS (
            SELECT 1 FROM app_workflow_stage_definitions stage_definition
            WHERE stage_definition.version_id = ${target.stage.workflowVersionId}::uuid
              AND stage_definition.code = configured.stage_key
          )
        )
        WHEN 'DEFER' THEN CASE
          WHEN ${configuration}::jsonb->>'targetType' = 'FUNDING_CALL'
            THEN EXISTS (
              SELECT 1 FROM app_funding_calls funding_call
              WHERE funding_call.reference =
                ${configuration}::jsonb->>'targetCallKey'
            )
          WHEN ${configuration}::jsonb->>'targetType' = 'DATE'
            THEN TRUE
          ELSE FALSE
        END
        ELSE TRUE
      END
      AND NOT EXISTS (
        SELECT 1 FROM app_workflow_transition_definitions transition
        LEFT JOIN app_workflow_stage_definitions target_stage
          ON target_stage.id = transition.to_stage_id
        WHERE transition.version_id = ${target.stage.workflowVersionId}::uuid
          AND transition.from_stage_id = ${target.stage.stageDefinitionId}::uuid
          AND transition.action_key = ${target.action.stableKey}
          AND (
            (transition.to_stage_id IS NULL)
              = (transition.terminal_outcome IS NULL)
            OR (
              transition.to_stage_id IS NOT NULL
              AND target_stage.version_id IS DISTINCT FROM
                ${target.stage.workflowVersionId}::uuid
            )
          )
      ) AS valid
  `);
  return (checked.rows[0] as { valid: boolean } | undefined)?.valid ?? false;
}

export async function completeActionTask(
  transaction: WorkflowActionExecutionTransaction,
  input: {
    normalizedInput: WorkflowActionInput;
    task: NonNullable<WorkflowActionExecutionTarget["task"]>;
  },
) {
  const completedAt = new Date();
  const [task] = await transaction
    .update(workflowTasks)
    .set({
      completedAt,
      result: input.normalizedInput,
      rowVersion: input.task.rowVersion + 1,
      startedAt: sql`COALESCE(${workflowTasks.startedAt}, ${completedAt})`,
      status: "COMPLETED",
    })
    .where(and(
      eq(workflowTasks.id, input.task.id),
      eq(workflowTasks.rowVersion, input.task.rowVersion),
      sql`${workflowTasks.status} IN ('CLAIMED', 'IN_PROGRESS')`,
    ))
    .returning({ id: workflowTasks.id });
  return task ?? null;
}

export async function recordWorkflowActionExecution(
  transaction: WorkflowActionExecutionTransaction,
  input: {
    action: WorkflowActionExecutionTarget["action"];
    actorId: string;
    conditionEvaluation: Record<string, unknown>;
    correlationId: string;
    expectedRuntimeVersion: number;
    id: string;
    idempotencyKey: string;
    normalizedInput: WorkflowActionInput;
    resolvedTarget: Record<string, unknown> | null;
    result: WorkflowActionExecutionResult;
    resultingRuntimeVersion: number;
    sourceStageInstanceId: string;
    taskBefore: WorkflowActionExecutionTarget["task"];
    taskId: string | null;
    workflowInstanceId: string;
  },
) {
  await transaction.insert(workflowActionExecutions).values({
    actionDefinitionId: input.action.id,
    actionKey: input.action.stableKey,
    actionType: input.action.actionType,
    actorId: input.actorId,
    actorIdentifier: input.actorId,
    actorType: "USER",
    comment: input.normalizedInput.comment ?? null,
    conditionEvaluation: input.conditionEvaluation,
    correlationId: input.correlationId,
    expectedRuntimeVersion: input.expectedRuntimeVersion,
    id: input.id,
    idempotencyKey: input.idempotencyKey,
    normalizedInput: input.normalizedInput,
    reasonCode: input.normalizedInput.reasonCode ?? null,
    resolvedTarget: input.resolvedTarget,
    result: input.result,
    resultingRuntimeVersion: input.resultingRuntimeVersion,
    sourceStageInstanceId: input.sourceStageInstanceId,
    taskId: input.taskId,
    workflowInstanceId: input.workflowInstanceId,
  });
  await transaction.insert(workflowEvents).values({
    actorId: input.actorId,
    correlationId: input.correlationId,
    eventCode: "ACTION_EXECUTED",
    payload: {
      actionExecutionId: input.id,
      actionKey: input.action.stableKey,
      actionType: input.action.actionType,
      resultingRuntimeVersion: input.resultingRuntimeVersion,
      sourceStageInstanceId: input.sourceStageInstanceId,
      taskId: input.taskId,
    },
    workflowInstanceId: input.workflowInstanceId,
  });
  await transaction.insert(workflowAuditEntries).values({
    action: "ACTION_EXECUTED",
    actorId: input.actorId,
    after: {
      actionKey: input.action.stableKey,
      actionType: input.action.actionType,
      resultingRuntimeVersion: input.resultingRuntimeVersion,
      resolvedTarget: input.resolvedTarget,
      task: input.taskBefore
        ? {
            id: input.taskBefore.id,
            rowVersion: input.taskBefore.rowVersion + 1,
            status: "COMPLETED",
          }
        : null,
    },
    before: {
      runtimeVersion: input.expectedRuntimeVersion,
      task: input.taskBefore
        ? {
            id: input.taskBefore.id,
            rowVersion: input.taskBefore.rowVersion,
            status: input.taskBefore.status,
          }
        : null,
    },
    correlationId: input.correlationId,
    idempotencyKey: input.idempotencyKey,
    reason: input.normalizedInput.reasonCode ?? input.normalizedInput.comment,
    stageInstanceId: input.sourceStageInstanceId,
    targetId: input.id,
    targetType: "WORKFLOW_ACTION_EXECUTION",
    taskId: input.taskId,
    workflowInstanceId: input.workflowInstanceId,
  });
}

export function workflowActionExecutionDatabase() {
  return getDatabase();
}
