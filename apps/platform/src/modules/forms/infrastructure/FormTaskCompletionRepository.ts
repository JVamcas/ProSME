import "server-only";

import { sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import type { FormRuntimeSchema } from "@/modules/forms/FormTypes";
import {
  advanceFormTaskWorkflow,
  findFormTaskTransition,
} from "./FormTaskTransitionRepository";

type Transaction = Parameters<
  Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]
>[0];

type CompletionInput = {
  actionKey: string;
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
  actionKey: string;
  nextStageName: string | null;
  rowVersion: number;
  taskInstanceId: string;
  taskStatus: "COMPLETED";
  workflowStatus: "ACTIVE" | "COMPLETED";
};

type LockedTask = {
  rowVersion: number;
  stageInstanceId: string;
  stageDefinitionId: string;
  workflowInstanceId: string;
  workflowVersionId: string;
};

type CompletionWriteResult =
  | { kind: "completed"; result: CompletionResult }
  | { kind: "conflict" }
  | { kind: "idempotency_conflict" }
  | { kind: "not_found" };

type Executor = Pick<ReturnType<typeof getDatabase>, "execute">;

class CommandKeyConflict extends Error {}

async function findCommand(
  executor: Executor,
  input: ReplayInput,
): Promise<CompletionWriteResult | null> {
  const result = await executor.execute(sql`
    SELECT actor_id AS "actorId", task_instance_id AS "taskInstanceId",
      row_version AS "rowVersion", next_stage_name AS "nextStageName",
      workflow_status AS "workflowStatus",
      result = ${JSON.stringify({
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
      taskStatus: "COMPLETED",
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
    SELECT task.row_version AS "rowVersion",
      stage.id AS "stageInstanceId",
      stage.workflow_stage_definition_id AS "stageDefinitionId",
      workflow.id AS "workflowInstanceId",
      workflow.workflow_template_version_id AS "workflowVersionId"
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
      AND EXISTS (
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
) {
  await transaction.execute(sql`
    UPDATE app_workflow_tasks
    SET status = 'COMPLETED',
      result = ${JSON.stringify({ values: input.values })}::jsonb,
      completed_at = ${completedAt},
      started_at = COALESCE(started_at, ${completedAt}),
      row_version = row_version + 1
    WHERE id = ${input.taskInstanceId}::uuid
  `);
}

async function stageHasRequiredTasks(
  transaction: Transaction,
  stageInstanceId: string,
) {
  const result = await transaction.execute(sql`
    SELECT count(*)::integer AS count
    FROM app_workflow_tasks task
    JOIN app_stage_task_definitions definition ON definition.id = task.workflow_task_definition_id
    WHERE task.stage_instance_id = ${stageInstanceId}::uuid
      AND definition.required = TRUE
      AND task.status <> 'COMPLETED'
  `);
  return Number((result.rows[0] as { count: number }).count) > 0;
}

async function appendCompletionRecords(
  transaction: Transaction,
  input: CompletionInput,
  task: LockedTask,
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
      ${JSON.stringify({ actionKey: input.actionKey, values: input.values })}::jsonb,
      ${completedAt}, ${result.rowVersion}, ${result.nextStageName},
      ${result.workflowStatus})
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING idempotency_key
  `);
  if (!command.rowCount) throw new CommandKeyConflict();
  await transaction.execute(sql`
    INSERT INTO app_workflow_events
      (workflow_instance_id, event_code, actor_id, correlation_id, payload)
    VALUES (${task.workflowInstanceId}::uuid, 'FORM_TASK_COMPLETED',
      ${input.actorId}::uuid, ${input.correlationId}::uuid,
      ${JSON.stringify(result)}::jsonb)
  `);
  await transaction.execute(sql`
    INSERT INTO app_workflow_audit_entries
      (actor_id, action, target_type, target_id, correlation_id,
       idempotency_key, before, after)
    VALUES (${input.actorId}::uuid, 'FORM_TASK_COMPLETED', 'TASK',
      ${input.taskInstanceId}, ${input.correlationId}::uuid,
      ${input.idempotencyKey},
      jsonb_build_object('rowVersion', ${input.expectedTaskRowVersion}),
      ${JSON.stringify(result)}::jsonb)
  `);
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
    VALUES ('FORM_TASK_COMPLETED', ${input.taskInstanceId}::uuid, 1,
      ${JSON.stringify(result)}::jsonb, ${input.correlationId}::uuid)
  `);
}

async function writeCompletion(
  transaction: Transaction,
  input: CompletionInput,
  task: LockedTask,
): Promise<CompletionResult | null> {
  const transition = await findFormTaskTransition(
    transaction,
    task,
    input.actionKey,
  );
  if (!transition) return null;
  const completedAt = new Date();
  const response = await completeSubmission(transaction, input, completedAt);
  if (!response) return null;
  await completeTaskRow(transaction, input, completedAt);
  const remaining = await stageHasRequiredTasks(
    transaction,
    task.stageInstanceId,
  );
  const advancement = remaining
    ? { nextStageName: null, workflowStatus: "ACTIVE" as const }
    : await advanceFormTaskWorkflow(
        transaction,
        task,
        transition,
        completedAt,
      );
  const result: CompletionResult = {
    actionKey: input.actionKey,
    ...advancement,
    rowVersion: input.expectedTaskRowVersion + 1,
    taskInstanceId: input.taskInstanceId,
    taskStatus: "COMPLETED",
  };
  await appendCompletionRecords(
    transaction,
    input,
    task,
    result,
    response,
    completedAt,
  );
  return result;
}

export async function completeFormTask(
  input: CompletionInput,
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
      const result = await writeCompletion(transaction, input, task);
      return result
        ? { kind: "completed" as const, result }
        : { kind: "conflict" as const };
    });
  } catch (error) {
    if (error instanceof CommandKeyConflict) {
      return (await findCommand(database, input)) ?? { kind: "conflict" };
    }
    throw error;
  }
}
