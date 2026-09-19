import "server-only";

import { sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import type { FormRuntimeSchema } from "@/modules/forms/FormTypes";

type Transaction = Parameters<
  Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]
>[0];

type CompletionInput = {
  actorId: string;
  correlationId: string;
  expectedTaskRowVersion: number;
  expectedSubmissionRowVersion?: number;
  idempotencyKey: string;
  taskInstanceId: string;
  formVersionId: string;
  definitionSnapshot: FormRuntimeSchema;
  values: Record<string, unknown>;
};

type ReplayInput = Pick<
  CompletionInput,
  "actorId" | "expectedTaskRowVersion" | "idempotencyKey" | "taskInstanceId" | "values"
>;

type CompletionResult = {
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
      result = ${JSON.stringify({ values: input.values })}::jsonb AS "sameResult"
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
      stage.stage_definition_id AS "stageDefinitionId",
      workflow.id AS "workflowInstanceId",
      workflow.workflow_version_id AS "workflowVersionId"
    FROM app_stage_task_instances task
    JOIN app_workflow_stage_instances stage ON stage.id = task.stage_instance_id
    JOIN app_workflow_instances workflow ON workflow.id = stage.workflow_instance_id
    WHERE task.id = ${input.taskInstanceId}::uuid
      AND task.assignment_user_id = ${input.actorId}::uuid
      AND task.form_version_id = ${input.formVersionId}::uuid
      AND task.row_version = ${input.expectedTaskRowVersion}
      AND task.status IN ('READY', 'CLAIMED', 'IN_PROGRESS')
      AND stage.status = 'ACTIVE' AND workflow.status = 'ACTIVE'
    FOR UPDATE OF task, stage, workflow
  `);
  return (result.rows[0] as LockedTask | undefined) ?? null;
}

async function completeSubmission(
  transaction: Transaction,
  input: CompletionInput,
  completedAt: Date,
) {
  const expectedVersion = input.expectedSubmissionRowVersion ?? null;
  const result = await transaction.execute(sql`
    INSERT INTO app_form_submissions
      (task_instance_id, form_version_id, status, values, definition_snapshot,
       created_by, updated_by, completed_at)
    VALUES (${input.taskInstanceId}::uuid, ${input.formVersionId}::uuid,
      'COMPLETED', ${JSON.stringify(input.values)}::jsonb,
      ${JSON.stringify(input.definitionSnapshot)}::jsonb,
      ${input.actorId}::uuid, ${input.actorId}::uuid, ${completedAt})
    ON CONFLICT (task_instance_id) DO UPDATE SET
      status = 'COMPLETED', values = EXCLUDED.values,
      definition_snapshot = EXCLUDED.definition_snapshot,
      updated_by = EXCLUDED.updated_by, updated_at = ${completedAt},
      completed_at = ${completedAt},
      row_version = app_form_submissions.row_version + 1
    WHERE app_form_submissions.status <> 'COMPLETED'
      AND ${expectedVersion}::integer IS NOT NULL
      AND app_form_submissions.row_version = ${expectedVersion}
    RETURNING id
  `);
  return Boolean(result.rowCount);
}

async function completeTaskRow(
  transaction: Transaction,
  input: CompletionInput,
  completedAt: Date,
) {
  await transaction.execute(sql`
    UPDATE app_stage_task_instances
    SET status = 'COMPLETED',
      result = ${JSON.stringify({ values: input.values })}::jsonb,
      ended_at = ${completedAt}, started_at = COALESCE(started_at, ${completedAt}),
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
    FROM app_stage_task_instances task
    JOIN app_stage_task_definitions definition ON definition.id = task.task_definition_id
    WHERE task.stage_instance_id = ${stageInstanceId}::uuid
      AND definition.required = TRUE
      AND task.status NOT IN ('COMPLETED', 'SKIPPED')
  `);
  return Number((result.rows[0] as { count: number }).count) > 0;
}

async function cancelOptionalTasks(
  transaction: Transaction,
  stageInstanceId: string,
  completedAt: Date,
) {
  await transaction.execute(sql`
    UPDATE app_stage_task_instances task
    SET status = 'CANCELLED', ended_at = ${completedAt}, row_version = row_version + 1
    FROM app_stage_task_definitions definition
    WHERE task.task_definition_id = definition.id
      AND task.stage_instance_id = ${stageInstanceId}::uuid
      AND definition.required = FALSE
      AND task.status NOT IN ('COMPLETED', 'CANCELLED')
  `);
}

async function findNextStage(
  transaction: Transaction,
  task: LockedTask,
) {
  const result = await transaction.execute(sql`
    SELECT id, name
    FROM app_workflow_stage_definitions
    WHERE version_id = ${task.workflowVersionId}::uuid
      AND sequence > (
        SELECT sequence FROM app_workflow_stage_definitions
        WHERE id = ${task.stageDefinitionId}::uuid
      )
    ORDER BY sequence ASC
    LIMIT 1
  `);
  return result.rows[0] as { id: string; name: string } | undefined;
}

async function createNextStage(
  transaction: Transaction,
  task: LockedTask,
  nextStage: { id: string; name: string },
  startedAt: Date,
) {
  const created = await transaction.execute(sql`
    INSERT INTO app_workflow_stage_instances
      (workflow_instance_id, stage_definition_id, status, started_at)
    VALUES (${task.workflowInstanceId}::uuid, ${nextStage.id}::uuid,
      'ACTIVE', ${startedAt})
    RETURNING id
  `);
  const stageId = (created.rows[0] as { id: string }).id;
  await transaction.execute(sql`
    INSERT INTO app_stage_task_instances
      (stage_instance_id, task_definition_id, type_snapshot, form_version_id,
       status, assignment_role_id, assignment_user_id, due_at)
    SELECT ${stageId}::uuid, definition.id, definition.type,
      definition.form_version_id, 'READY', definition.assignment_role_id,
      definition.assignment_user_id,
      CASE WHEN stage.sla_hours IS NULL THEN NULL
        ELSE ${startedAt} + make_interval(hours => stage.sla_hours) END
    FROM app_stage_task_definitions definition
    JOIN app_workflow_stage_definitions stage ON stage.id = definition.stage_id
    WHERE definition.stage_id = ${nextStage.id}::uuid
  `);
  await transaction.execute(sql`
    UPDATE app_workflow_instances
    SET current_stage_instance_id = ${stageId}::uuid
    WHERE id = ${task.workflowInstanceId}::uuid
  `);
  return nextStage.name;
}

async function advanceWorkflow(
  transaction: Transaction,
  task: LockedTask,
  completedAt: Date,
) {
  await transaction.execute(sql`
    UPDATE app_workflow_stage_instances
    SET status = 'COMPLETED', ended_at = ${completedAt}
    WHERE id = ${task.stageInstanceId}::uuid
  `);
  await cancelOptionalTasks(transaction, task.stageInstanceId, completedAt);
  const nextStage = await findNextStage(transaction, task);
  if (!nextStage) {
    await transaction.execute(sql`
      UPDATE app_workflow_instances SET status = 'COMPLETED', ended_at = ${completedAt}
      WHERE id = ${task.workflowInstanceId}::uuid
    `);
    return { nextStageName: null, workflowStatus: "COMPLETED" as const };
  }
  return {
    nextStageName: await createNextStage(transaction, task, nextStage, completedAt),
    workflowStatus: "ACTIVE" as const,
  };
}

async function appendCompletionRecords(
  transaction: Transaction,
  input: CompletionInput,
  task: LockedTask,
  result: CompletionResult,
  completedAt: Date,
) {
  const command = await transaction.execute(sql`
    INSERT INTO app_task_completion_commands
      (idempotency_key, task_instance_id, actor_id, result, completed_at,
       row_version, next_stage_name, workflow_status)
    VALUES (${input.idempotencyKey}, ${input.taskInstanceId}::uuid,
      ${input.actorId}::uuid, ${JSON.stringify({ values: input.values })}::jsonb,
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
  const completedAt = new Date();
  if (!(await completeSubmission(transaction, input, completedAt))) return null;
  await completeTaskRow(transaction, input, completedAt);
  const remaining = await stageHasRequiredTasks(
    transaction,
    task.stageInstanceId,
  );
  const advancement = remaining
    ? { nextStageName: null, workflowStatus: "ACTIVE" as const }
    : await advanceWorkflow(transaction, task, completedAt);
  const result: CompletionResult = {
    ...advancement,
    rowVersion: input.expectedTaskRowVersion + 1,
    taskInstanceId: input.taskInstanceId,
    taskStatus: "COMPLETED",
  };
  await appendCompletionRecords(transaction, input, task, result, completedAt);
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
