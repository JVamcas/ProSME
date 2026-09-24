import "server-only";

import { sql } from "drizzle-orm";

import { taskWorkIsReady } from "@/modules/workflows/WorkflowTaskRegistry";

import { getDatabase } from "@/db/client";
import type { FormRuntimeSchema } from "@/modules/forms/FormTypes";
import type { SequentialTransitionResult } from "@/modules/workflows/application/runtime/ServerSequentialTransitionService";
import { readSequentialTransitionAdvancement } from "@/modules/workflows/infrastructure/RuntimeTransitionAdvancement";
import { appendTaskCompletionAndActionAudit } from "@/modules/workflows/infrastructure/RuntimeAuditWriteRepository";
import { appendTaskCompletionAudit } from "@/modules/workflows/infrastructure/RuntimeAuditWriteRepository";

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

type CompletionInput = {
  actionKey: string | null;
  actorId: string;
  correlationId: string;
  expectedTaskRowVersion: number;
  expectedResponseRowVersion?: number;
  idempotencyKey: string;
  taskInstanceId: string;
  formVersionId: string;
  definitionSnapshot: FormRuntimeSchema;
  values: Record<string, unknown>;
};

type ReplayInput = Pick<
  CompletionInput,
  | "actionKey"
  | "actorId"
  | "expectedTaskRowVersion"
  | "idempotencyKey"
  | "taskInstanceId"
  | "values"
>;

type CompletionResult = {
  actionKey: string | null;
  nextStageName: string | null;
  rowVersion: number;
  taskInstanceId: string;
  taskStatus: "IN_PROGRESS" | "COMPLETED";
  workflowStatus: "ACTIVE" | "COMPLETED";
};

type LockedTask = {
  hasActions: boolean;
  config: unknown;
  result: unknown;
  rowVersion: number;
  stageInstanceId: string;
  workflowInstanceId: string;
};

type CompletionWriteResult =
  | { kind: "completed"; result: CompletionResult }
  | { kind: "conflict" }
  | { kind: "idempotency_conflict" }
  | { kind: "not_found" };

type Executor = Pick<ReturnType<typeof getDatabase>, "execute">;

class CommandKeyConflict extends Error {}
class WorkflowTransitionConflict extends Error {}

async function findCommand(
  executor: Executor,
  input: ReplayInput,
): Promise<CompletionWriteResult | null> {
  const result = await executor.execute(sql`
    SELECT actor_id AS "actorId", task_instance_id AS "taskInstanceId",
      row_version AS "rowVersion", next_stage_name AS "nextStageName",
      COALESCE(result ->> 'taskStatus', 'COMPLETED') AS "taskStatus",
      workflow_status AS "workflowStatus",
      (result - 'taskStatus') = ${JSON.stringify({
        actionKey: input.actionKey,
        values: input.values,
      })}::jsonb AS "sameResult"
    FROM app_task_completion_commands
    WHERE idempotency_key = ${input.idempotencyKey}
  `);
  const replay = result.rows[0] as {
    actorId: string;
    taskInstanceId: string;
    rowVersion: number;
    nextStageName: string | null;
    workflowStatus: "ACTIVE" | "COMPLETED";
    sameResult: boolean;
    taskStatus: "IN_PROGRESS" | "COMPLETED";
  } | undefined;
  if (!replay) return null;
  const sameCommand = replay.actorId === input.actorId
    && replay.taskInstanceId === input.taskInstanceId
    && replay.rowVersion === input.expectedTaskRowVersion + 1
    && replay.sameResult;
  if (!sameCommand) return { kind: "idempotency_conflict" };
  return {
    kind: "completed",
    result: {
      actionKey: input.actionKey,
      nextStageName: replay.nextStageName,
      rowVersion: replay.rowVersion,
      taskInstanceId: replay.taskInstanceId,
      taskStatus: replay.taskStatus,
      workflowStatus: replay.workflowStatus,
    },
  };
}

export function readFormTaskCompletion(input: ReplayInput) {
  return findCommand(getDatabase(), input);
}

async function lockTask(
  transaction: Transaction,
  input: CompletionInput,
): Promise<LockedTask | null> {
  const result = await transaction.execute(sql`
    SELECT task.row_version AS "rowVersion", task.result,
      definition.config,
      EXISTS (
        SELECT 1 FROM app_stage_task_action_bindings binding
        WHERE binding.task_definition_id = definition.id
      ) AS "hasActions",
      stage.id AS "stageInstanceId",
      workflow.id AS "workflowInstanceId"
    FROM app_workflow_tasks task
    JOIN app_stage_task_definitions definition
      ON definition.id = task.workflow_task_definition_id
    JOIN app_workflow_stage_instances stage ON stage.id = task.stage_instance_id
    JOIN app_workflow_instances workflow ON workflow.id = stage.workflow_instance_id
    WHERE task.id = ${input.taskInstanceId}::uuid
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
      AND task.form_version_id = ${input.formVersionId}::uuid
      AND task.row_version = ${input.expectedTaskRowVersion}
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
    FOR UPDATE OF task, stage, workflow
  `);
  return (result.rows[0] as LockedTask | undefined) ?? null;
}

async function completeSubmission(
  transaction: Transaction,
  input: CompletionInput,
  completedAt: Date,
) {
  const expectedVersion = input.expectedResponseRowVersion ?? null;
  const result = await transaction.execute(sql`
    INSERT INTO app_form_responses
      (workflow_task_id, form_version_id, status, values, definition_snapshot,
       respondent_user_id, created_by, updated_by, completed_at)
    VALUES (${input.taskInstanceId}::uuid, ${input.formVersionId}::uuid,
      'COMPLETED', ${JSON.stringify(input.values)}::jsonb,
      ${JSON.stringify(input.definitionSnapshot)}::jsonb,
      ${input.actorId}::uuid,
      ${input.actorId}::uuid, ${input.actorId}::uuid, ${completedAt})
    ON CONFLICT (workflow_task_id, respondent_user_id) DO UPDATE SET
      status = 'COMPLETED', values = EXCLUDED.values,
      definition_snapshot = EXCLUDED.definition_snapshot,
      updated_by = EXCLUDED.updated_by, updated_at = ${completedAt},
      completed_at = ${completedAt},
      row_version = app_form_responses.row_version + 1
    WHERE app_form_responses.status <> 'COMPLETED'
      AND app_form_responses.form_version_id = ${input.formVersionId}::uuid
      AND ${expectedVersion}::integer IS NOT NULL
      AND app_form_responses.row_version = ${expectedVersion}
    RETURNING id, row_version AS "rowVersion"
  `);
  return (result.rows[0] as {
    id: string;
    rowVersion: number;
  } | undefined) ?? null;
}

async function completeTaskRow(
  transaction: Transaction,
  input: CompletionInput,
  completedAt: Date,
  taskStatus: "IN_PROGRESS" | "COMPLETED",
) {
  await transaction.execute(sql`
    UPDATE app_workflow_tasks
    SET status = ${taskStatus},
      result = COALESCE(result, '{}'::jsonb)
        || ${JSON.stringify({ values: input.values })}::jsonb,
      completed_at = CASE
        WHEN ${taskStatus} = 'COMPLETED' THEN ${completedAt}
        ELSE NULL
      END,
      started_at = COALESCE(started_at, ${completedAt}),
      row_version = row_version + 1
    WHERE id = ${input.taskInstanceId}::uuid
  `);
}

async function appendCompletionRecords(
  transaction: Transaction,
  input: CompletionInput,
  result: CompletionResult,
  response: { id: string; rowVersion: number },
  completedAt: Date,
) {
  const command = await transaction.execute(sql`
    INSERT INTO app_task_completion_commands
      (idempotency_key, task_instance_id, actor_id, result, completed_at,
       row_version, next_stage_name, workflow_status)
    VALUES (${input.idempotencyKey}, ${input.taskInstanceId}::uuid,
      ${input.actorId}::uuid,
      ${JSON.stringify({ actionKey: input.actionKey, values: input.values, taskStatus: result.taskStatus })}::jsonb,
      ${completedAt}, ${result.rowVersion}, ${result.nextStageName},
      ${result.workflowStatus})
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING idempotency_key
  `);
  if (!command.rowCount) throw new CommandKeyConflict();
  await transaction.execute(sql`
    INSERT INTO app_workflow_audit_entries
      (actor_id, action, target_type, target_id, correlation_id,
       before, after)
    VALUES (${input.actorId}::uuid, 'FORM_RESPONSE_COMPLETED', 'FORM_RESPONSE',
      ${response.id}, ${input.correlationId}::uuid,
      jsonb_build_object(
        'rowVersion', ${input.expectedResponseRowVersion ?? null}::integer,
        'status', CASE
          WHEN ${input.expectedResponseRowVersion ?? null}::integer IS NULL
            THEN NULL
          ELSE 'DRAFT'
        END
      ),
      jsonb_build_object(
        'formVersionId', ${input.formVersionId}::text,
        'respondentUserId', ${input.actorId}::text,
        'rowVersion', ${response.rowVersion},
        'status', 'COMPLETED',
        'values', ${JSON.stringify(input.values)}::jsonb,
        'workflowTaskId', ${input.taskInstanceId}::text
      ))
  `);
  await transaction.execute(sql`
    INSERT INTO app_transactional_outbox
      (event_code, aggregate_id, schema_version, payload, correlation_id)
    VALUES (${result.taskStatus === 'COMPLETED' ? 'FORM_TASK_COMPLETED' : 'FORM_RESPONSE_COMPLETED'}, ${input.taskInstanceId}::uuid, 1,
      ${JSON.stringify(result)}::jsonb, ${input.correlationId}::uuid)
  `);
}

async function writeCompletion(
  transaction: Transaction,
  input: CompletionInput,
  task: LockedTask,
  executeTransition: ExecuteTransition,
): Promise<CompletionResult | null> {
  if (input.actionKey && !taskWorkIsReady({
    config: task.config,
    formCompleted: true,
    formRequired: true,
    result: task.result,
  })) return null;
  const completedAt = new Date();
  const response = await completeSubmission(transaction, input, completedAt);
  if (!response) return null;
  const taskStatus = (task.hasActions && !input.actionKey)
    || !taskWorkIsReady({
      config: task.config,
      formCompleted: true,
      formRequired: true,
      result: task.result,
    })
    ? "IN_PROGRESS" as const
    : "COMPLETED" as const;
  await completeTaskRow(transaction, input, completedAt, taskStatus);
  const auditInput = {
    actorId: input.actorId,
    beforeRowVersion: input.expectedTaskRowVersion,
    completedAt,
    correlationId: input.correlationId,
    idempotencyKey: input.idempotencyKey,
    stageInstanceId: task.stageInstanceId,
    taskId: input.taskInstanceId,
    workflowInstanceId: task.workflowInstanceId,
  };
  let advancement: {
    nextStageName: string | null;
    workflowStatus: "ACTIVE" | "COMPLETED";
  } = {
    nextStageName: null,
    workflowStatus: "ACTIVE" as const,
  };
  if (input.actionKey) {
    await appendTaskCompletionAndActionAudit(transaction, {
      ...auditInput,
      actionKey: input.actionKey,
    });
    const transition = await executeTransition(transaction, {
      actionKey: input.actionKey,
      actorId: input.actorId,
      correlationId: input.correlationId,
      sourceStageInstanceId: task.stageInstanceId,
    });
    const next = readSequentialTransitionAdvancement(transition);
    if (!next) throw new WorkflowTransitionConflict();
    advancement = next;
  } else if (taskStatus === "COMPLETED") {
    await appendTaskCompletionAudit(transaction, auditInput);
  }
  const result: CompletionResult = {
    actionKey: input.actionKey,
    ...advancement,
    rowVersion: input.expectedTaskRowVersion + 1,
    taskInstanceId: input.taskInstanceId,
    taskStatus,
  };
  await appendCompletionRecords(
    transaction,
    input,
    result,
    response,
    completedAt,
  );
  return result;
}

export async function completeFormTask(
  input: CompletionInput,
  executeTransition: ExecuteTransition,
): Promise<CompletionWriteResult> {
  const database = getDatabase();
  const replay = await findCommand(database, input);
  if (replay) return replay;
  try {
    return await database.transaction(async (transaction) => {
      const task = await lockTask(transaction, input);
      if (!task) {
        const insideReplay = await findCommand(transaction, input);
        return insideReplay ?? { kind: "not_found" as const };
      }
      const insideReplay = await findCommand(transaction, input);
      if (insideReplay) return insideReplay;
      const result = await writeCompletion(
        transaction,
        input,
        task,
        executeTransition,
      );
      return result
        ? { kind: "completed" as const, result }
        : { kind: "conflict" as const };
    });
  } catch (error) {
    if (error instanceof CommandKeyConflict) {
      return (await findCommand(database, input)) ?? { kind: "conflict" };
    }
    if (error instanceof WorkflowTransitionConflict) {
      return { kind: "conflict" };
    }
    throw error;
  }
}
