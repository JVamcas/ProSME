import "server-only";

import { taskHasChecklist, taskWorkIsReady } from "@/modules/workflows/WorkflowTaskRegistry";
import {
  loadRequiredTaskCompletions,
  recordReviewThresholdEvaluations,
} from "./StageCompletionRepository";
import { evaluateStageQuorum } from "./WorkflowQuorumRepository";
import { readSequentialTransitionAdvancement } from "./RuntimeTransitionAdvancement";

import { sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import type {
  ChecklistResultItem,
  TaskCompletionResult,
} from "@/modules/work-queue/TaskTypes";
import type {
  SequentialTransitionResult,
} from "@/modules/workflows/application/runtime/ServerSequentialTransitionService";
import {
  appendTaskCompletionAndActionAudit,
  appendTaskCompletionAudit,
} from "./RuntimeAuditWriteRepository";

type Transaction = Parameters<
  Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]
>[0];

type ExecuteTransition = (
  transaction: Transaction,
  input: {
    actionKey: string;
    actorId: string;
    correlationId: string;
    sourceStageInstanceId: string;
  },
) => Promise<SequentialTransitionResult>;

type LockedTask = {
  actionType: string | null;
  formCompleted: boolean;
  formRequired: boolean;
  hasActions: boolean;
  config: unknown;
  result: unknown;
  stageDefinitionId: string;
  stageInstanceId: string;
  taskStatus: string;
  workflowInstanceId: string;
  workflowVersionId: string;
};

type CompletionWriteResult =
  | { kind: "completed"; result: TaskCompletionResult }
  | { kind: "conflict" }
  | { kind: "idempotency_conflict" }
  | { kind: "not_found" };

type WriteInput = {
  actionKey: string | null;
  actorId: string;
  correlationId: string;
  expectedRowVersion: number;
  idempotencyKey: string;
  items: ChecklistResultItem[];
  taskId: string;
};

class CommandKeyConflict extends Error {}
class WorkflowWriteConflict extends Error {}

async function findCommand(
  executor: Pick<ReturnType<typeof getDatabase>, "execute">,
  input: WriteInput,
): Promise<CompletionWriteResult | null> {
  const found = await executor.execute(sql`
    SELECT task_instance_id AS "taskInstanceId", actor_id AS "actorId",
      row_version AS "rowVersion", next_stage_name AS "nextStageName",
      workflow_status AS "workflowStatus",
      COALESCE(result ->> 'taskStatus', 'COMPLETED') AS "taskStatus",
      (result - 'taskStatus') = ${JSON.stringify({
        actionKey: input.actionKey,
        items: input.items,
      })}::jsonb AS "sameResult"
    FROM app_task_completion_commands
    WHERE idempotency_key = ${input.idempotencyKey}
  `);
  const row = found.rows[0] as (
    TaskCompletionResult & { actorId: string; sameResult: boolean }
  ) | undefined;
  if (!row) return null;
  const sameCommand = row.actorId === input.actorId
    && row.taskInstanceId === input.taskId
    && row.rowVersion === input.expectedRowVersion + 1
    && row.sameResult;
  if (!sameCommand) {
    return { kind: "idempotency_conflict" };
  }
  return {
    kind: "completed",
    result: {
      actionKey: input.actionKey,
      nextStageName: row.nextStageName,
      rowVersion: row.rowVersion,
      taskInstanceId: row.taskInstanceId,
      taskStatus: row.taskStatus,
      workflowStatus: row.workflowStatus,
    },
  };
}

export function readChecklistTaskCompletion(input: WriteInput) {
  return findCommand(getDatabase(), input);
}

async function lockTask(
  transaction: Transaction,
  input: WriteInput,
): Promise<LockedTask | null> {
  const locked = await transaction.execute(sql`
    SELECT task.status AS "taskStatus", task.result,
      task.form_version_id IS NOT NULL AS "formRequired",
      (task.form_version_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM app_form_responses response
        WHERE response.workflow_task_id = task.id
          AND response.status = 'COMPLETED'
      )) AS "formCompleted",
      EXISTS (
        SELECT 1 FROM app_stage_task_action_bindings binding
        WHERE binding.task_definition_id = definition.id
      ) AS "hasActions",
      (
        SELECT action.action_type
        FROM app_workflow_action_definitions action
        WHERE action.stage_id = stage.workflow_stage_definition_id
          AND action.stable_key = ${input.actionKey}
      ) AS "actionType",
      definition.config, stage.id AS "stageInstanceId",
      stage.workflow_stage_definition_id AS "stageDefinitionId",
      workflow.id AS "workflowInstanceId",
      workflow.workflow_template_version_id AS "workflowVersionId"
    FROM app_workflow_tasks task
    JOIN app_stage_task_definitions definition
      ON definition.id = task.workflow_task_definition_id
    JOIN app_workflow_stage_instances stage ON stage.id = task.stage_instance_id
    JOIN app_workflow_instances workflow ON workflow.id = stage.workflow_instance_id
    WHERE task.id = ${input.taskId}::uuid
      AND (
        task.assigned_user_id = ${input.actorId}::uuid
        OR (
          task.assigned_user_id IS NULL
          AND task.assigned_role_id IN (
            SELECT role_id FROM app_user_roles
            WHERE user_id = ${input.actorId}::uuid
          )
        )
      )
      AND task.row_version = ${input.expectedRowVersion}
      AND task.status IN ('CLAIMED', 'IN_PROGRESS')
      AND stage.status = 'ACTIVE' AND workflow.status = 'ACTIVE'
      AND (
        (${input.actionKey}::text IS NULL)
        OR (${input.actionKey}::text IS NOT NULL AND EXISTS (
          SELECT 1
          FROM app_workflow_action_definitions action
          WHERE action.stage_id = stage.workflow_stage_definition_id
            AND action.stable_key = ${input.actionKey}
            AND action.enabled = TRUE
            AND EXISTS (
              SELECT 1 FROM app_stage_task_action_bindings binding
              WHERE binding.task_definition_id = definition.id
                AND binding.stage_id = stage.workflow_stage_definition_id
                AND binding.action_key = action.stable_key
            )
        ))
      )
    FOR UPDATE OF task
  `);
  return (locked.rows[0] as LockedTask | undefined) ?? null;
}

async function completeTask(
  transaction: Transaction,
  input: WriteInput,
  completedAt: Date,
  taskStatus: "IN_PROGRESS" | "COMPLETED",
) {
  await transaction.execute(sql`
    UPDATE app_workflow_tasks
    SET status = ${taskStatus},
      result = COALESCE(result, '{}'::jsonb)
        || ${JSON.stringify({ items: input.items })}::jsonb,
      completed_at = CASE
        WHEN ${taskStatus} = 'COMPLETED' THEN ${completedAt}
        ELSE NULL
      END,
      started_at = COALESCE(started_at, ${completedAt}),
      row_version = row_version + 1
    WHERE id = ${input.taskId}::uuid
  `);
}

function transitionAdvancement(result: SequentialTransitionResult) {
  const advancement = readSequentialTransitionAdvancement(result);
  if (!advancement) throw new WorkflowWriteConflict();
  return advancement;
}

async function appendCompletionRecords(
  transaction: Transaction,
  input: WriteInput,
  result: TaskCompletionResult,
  completedAt: Date,
) {
  const command = await transaction.execute(sql`
    INSERT INTO app_task_completion_commands
      (idempotency_key, task_instance_id, actor_id, result, completed_at,
       row_version, next_stage_name, workflow_status)
    VALUES (${input.idempotencyKey}, ${input.taskId}::uuid, ${input.actorId}::uuid,
      ${JSON.stringify({ actionKey: input.actionKey, items: input.items, taskStatus: result.taskStatus })}::jsonb, ${completedAt},
      ${result.rowVersion}, ${result.nextStageName}, ${result.workflowStatus})
    ON CONFLICT (idempotency_key) DO NOTHING RETURNING idempotency_key
  `);
  if (!command.rowCount) throw new CommandKeyConflict();
  await transaction.execute(sql`
    INSERT INTO app_transactional_outbox
      (event_code, aggregate_id, schema_version, payload, correlation_id)
    VALUES (${result.taskStatus === 'COMPLETED' ? 'TASK_COMPLETED' : 'CHECKLIST_COMPLETED'}, ${input.taskId}::uuid, 1,
      ${JSON.stringify(result)}::jsonb, ${input.correlationId}::uuid)
  `);
}

function isAuditKeyConflict(error: unknown) {
  return Boolean(
    error
    && typeof error === "object"
    && "code" in error
    && error.code === "23505"
    && "constraint" in error
    && error.constraint === "app_workflow_audit_idempotency_unique",
  );
}

export async function writeChecklistTaskCompletion(
  input: WriteInput,
  executeTransition: ExecuteTransition,
): Promise<CompletionWriteResult> {
  const database = getDatabase();
  const replay = await findCommand(database, input);
  if (replay) return replay;
  try {
    return await database.transaction(async (transaction) => {
      await transaction.execute(sql`
        SELECT stage.id
        FROM app_workflow_stage_instances stage
        JOIN app_workflow_tasks task ON task.stage_instance_id = stage.id
        WHERE task.id = ${input.taskId}::uuid
        FOR UPDATE OF stage
      `);
      const task = await lockTask(transaction, input);
      if (!task) return { kind: "not_found" } as const;
      const insideReplay = await findCommand(transaction, input);
      if (insideReplay) return insideReplay;
      if (!taskHasChecklist(task.config)) return { kind: "conflict" } as const;
      const completedAt = new Date();
      if (task.actionType === "APPROVE_ADVANCE"
        || task.actionType === "REJECT") {
        const quorumSatisfied = await evaluateStageQuorum(transaction, {
          actorId: input.actorId,
          stageDefinitionId: task.stageDefinitionId,
          stageInstanceId: task.stageInstanceId,
        });
        if (!quorumSatisfied) return { kind: "conflict" } as const;
      }
      if (input.actionKey && task.formRequired && !task.formCompleted) {
        return { kind: "conflict" } as const;
      }
      const priorResult = task.result && typeof task.result === "object"
        && !Array.isArray(task.result)
        ? task.result as Record<string, unknown>
        : {};
      const taskStatus = (task.hasActions && !input.actionKey)
        || !taskWorkIsReady({
          config: task.config,
          formCompleted: task.formCompleted,
          formRequired: task.formRequired,
          result: { ...priorResult, items: input.items },
        })
        ? "IN_PROGRESS" as const
        : "COMPLETED" as const;
      await completeTask(transaction, input, completedAt, taskStatus);
      if (taskStatus === "COMPLETED") {
        const requirements = await loadRequiredTaskCompletions(
          transaction,
          task.stageInstanceId,
        );
        await recordReviewThresholdEvaluations(transaction, {
          actorId: input.actorId,
          requirements,
          stageInstanceId: task.stageInstanceId,
          triggerTaskId: input.taskId,
        });
      }
      const auditInput = {
        actorId: input.actorId,
        beforeRowVersion: input.expectedRowVersion,
        beforeStatus: task.taskStatus,
        completedAt,
        correlationId: input.correlationId,
        idempotencyKey: input.idempotencyKey,
        stageInstanceId: task.stageInstanceId,
        taskId: input.taskId,
        workflowInstanceId: task.workflowInstanceId,
      };
      if (input.actionKey) {
        await appendTaskCompletionAndActionAudit(transaction, {
          ...auditInput,
          actionKey: input.actionKey,
        });
      } else if (taskStatus === "COMPLETED") {
        await appendTaskCompletionAudit(transaction, auditInput);
      }
      const advancement = input.actionKey
        ? transitionAdvancement(await executeTransition(transaction, {
            actionKey: input.actionKey,
            actorId: input.actorId,
            correlationId: input.correlationId,
            sourceStageInstanceId: task.stageInstanceId,
          }))
        : { nextStageName: null, workflowStatus: "ACTIVE" as const };
      const result: TaskCompletionResult = {
        actionKey: input.actionKey,
        ...advancement,
        rowVersion: input.expectedRowVersion + 1,
        taskInstanceId: input.taskId,
        taskStatus,
      };
      await appendCompletionRecords(transaction, input, result, completedAt);
      return { kind: "completed", result };
    });
  } catch (error) {
    if (error instanceof CommandKeyConflict) {
      return (await findCommand(database, input)) ?? { kind: "conflict" };
    }
    if (error instanceof WorkflowWriteConflict) return { kind: "conflict" };
    if (isAuditKeyConflict(error)) return { kind: "idempotency_conflict" };
    throw error;
  }
}
