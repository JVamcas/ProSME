import "server-only";

import { sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import type {
  ChecklistResultItem,
  TaskCompletionResult,
} from "@/modules/work-queue/TaskTypes";

type Transaction = Parameters<
  Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]
>[0];

type LockedTask = {
  config: unknown;
  stageDefinitionId: string;
  stageInstanceId: string;
  taskStatus: string;
  taskType: string;
  workflowInstanceId: string;
  workflowVersionId: string;
};

type CompletionWriteResult =
  | { kind: "completed"; result: TaskCompletionResult }
  | { kind: "conflict" }
  | { kind: "idempotency_conflict" }
  | { kind: "not_found" };

type WriteInput = {
  actionKey: string;
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
      result = ${JSON.stringify({
        actionKey: input.actionKey,
        items: input.items,
      })}::jsonb AS "sameResult",
      'COMPLETED'::text AS "taskStatus"
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
      taskStatus: "COMPLETED",
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
    SELECT task.status AS "taskStatus", task.type_snapshot AS "taskType",
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
      AND task.status IN ('CLAIMED', 'IN_PROGRESS', 'READY')
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
    FOR UPDATE OF task
  `);
  return (locked.rows[0] as LockedTask | undefined) ?? null;
}

async function completeTask(
  transaction: Transaction,
  input: WriteInput,
  completedAt: Date,
) {
  await transaction.execute(sql`
    UPDATE app_workflow_tasks
    SET status = 'COMPLETED', result = ${JSON.stringify({ items: input.items })}::jsonb,
      completed_at = ${completedAt},
      started_at = COALESCE(started_at, ${completedAt}),
      row_version = row_version + 1
    WHERE id = ${input.taskId}::uuid
  `);
}

async function requiredTasksRemain(
  transaction: Transaction,
  stageInstanceId: string,
) {
  const result = await transaction.execute(sql`
    SELECT count(*)::integer AS count
    FROM app_workflow_tasks task
    JOIN app_stage_task_definitions definition
      ON definition.id = task.workflow_task_definition_id
    WHERE task.stage_instance_id = ${stageInstanceId}::uuid
      AND definition.required = TRUE
      AND task.status NOT IN ('COMPLETED', 'SKIPPED')
  `);
  return Number((result.rows[0] as { count: number }).count) > 0;
}

async function findTransition(
  transaction: Transaction,
  task: LockedTask,
  actionKey: string,
) {
  const result = await transaction.execute(sql`
    SELECT transition.to_stage_id AS "toStageId",
      transition.terminal_outcome AS "terminalOutcome",
      target.name AS "nextStageName", target.sla_hours AS "slaHours"
    FROM app_workflow_transition_definitions transition
    LEFT JOIN app_workflow_stage_definitions target
      ON target.id = transition.to_stage_id
    WHERE transition.version_id = ${task.workflowVersionId}::uuid
      AND transition.from_stage_id = ${task.stageDefinitionId}::uuid
      AND transition.action_key = ${actionKey}
    ORDER BY transition.priority ASC
    LIMIT 1
  `);
  return result.rows[0] as {
    nextStageName: string | null;
    slaHours: number | null;
    terminalOutcome: string | null;
    toStageId: string | null;
  } | undefined;
}

async function activateNextStage(
  transaction: Transaction,
  task: LockedTask,
  transition: Awaited<ReturnType<typeof findTransition>>,
  completedAt: Date,
) {
  await transaction.execute(sql`
    UPDATE app_workflow_stage_instances
    SET status = 'COMPLETED', completed_at = ${completedAt}
    WHERE id = ${task.stageInstanceId}::uuid
  `);
  if (!transition?.toStageId) {
    await transaction.execute(sql`
      UPDATE app_workflow_instances
      SET status = 'COMPLETED', completed_at = ${completedAt}
      WHERE id = ${task.workflowInstanceId}::uuid
    `);
    return "COMPLETED" as const;
  }
  const inserted = await transaction.execute(sql`
    INSERT INTO app_workflow_stage_instances
      (workflow_instance_id, workflow_stage_definition_id, status, activated_at)
    VALUES (${task.workflowInstanceId}::uuid, ${transition.toStageId}::uuid, 'ACTIVE', ${completedAt})
    RETURNING id
  `);
  const nextStageId = (inserted.rows[0] as { id: string }).id;
  await createNextTasks(transaction, transition.toStageId, nextStageId, completedAt);
  await transaction.execute(sql`
    UPDATE app_workflow_instances SET current_stage_instance_id = ${nextStageId}::uuid
    WHERE id = ${task.workflowInstanceId}::uuid
  `);
  return "ACTIVE" as const;
}

async function createNextTasks(
  transaction: Transaction,
  stageDefinitionId: string,
  stageInstanceId: string,
  startedAt: Date,
) {
  await transaction.execute(sql`
    INSERT INTO app_workflow_tasks
      (stage_instance_id, workflow_task_definition_id, type_snapshot, status,
       assigned_role_id, assigned_user_id, form_version_id, due_at)
    SELECT ${stageInstanceId}::uuid, task.id, task.type, 'READY',
      task.assignment_role_id, task.assignment_user_id,
      binding.form_version_id,
      CASE WHEN stage.sla_hours IS NULL THEN NULL
        ELSE ${startedAt}::timestamptz
          + make_interval(hours => stage.sla_hours) END
    FROM app_stage_task_definitions task
    JOIN app_workflow_stage_definitions stage ON stage.id = task.stage_id
    LEFT JOIN app_stage_task_form_bindings binding
      ON binding.task_definition_id = task.id
    WHERE task.stage_id = ${stageDefinitionId}::uuid
  `);
}

async function appendCompletion(
  transaction: Transaction,
  input: WriteInput,
  task: LockedTask,
  result: TaskCompletionResult,
  completedAt: Date,
) {
  const command = await transaction.execute(sql`
    INSERT INTO app_task_completion_commands
      (idempotency_key, task_instance_id, actor_id, result, completed_at,
       row_version, next_stage_name, workflow_status)
    VALUES (${input.idempotencyKey}, ${input.taskId}::uuid, ${input.actorId}::uuid,
      ${JSON.stringify({ actionKey: input.actionKey, items: input.items })}::jsonb, ${completedAt},
      ${result.rowVersion}, ${result.nextStageName}, ${result.workflowStatus})
    ON CONFLICT (idempotency_key) DO NOTHING RETURNING idempotency_key
  `);
  if (!command.rowCount) throw new CommandKeyConflict();
  await transaction.execute(sql`
    INSERT INTO app_workflow_events
      (workflow_instance_id, event_code, actor_id, correlation_id, payload)
    VALUES (${task.workflowInstanceId}::uuid, 'TASK_COMPLETED',
      ${input.actorId}::uuid, ${input.correlationId}::uuid,
      ${JSON.stringify(result)}::jsonb)
  `);
  await transaction.execute(sql`
    INSERT INTO app_workflow_audit_entries
      (actor_id, action, target_type, target_id, correlation_id,
       idempotency_key, before, after)
    VALUES (${input.actorId}::uuid, 'TASK_COMPLETED', 'TASK', ${input.taskId},
      ${input.correlationId}::uuid, ${input.idempotencyKey},
      jsonb_build_object(
        'status', ${task.taskStatus}::text,
        'rowVersion', ${input.expectedRowVersion}::integer
      ),
      ${JSON.stringify(result)}::jsonb)
  `);
  await transaction.execute(sql`
    INSERT INTO app_transactional_outbox
      (event_code, aggregate_id, schema_version, payload, correlation_id)
    VALUES ('TASK_COMPLETED', ${input.taskId}::uuid, 1,
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
): Promise<CompletionWriteResult> {
  const database = getDatabase();
  const replay = await findCommand(database, input);
  if (replay) return replay;
  try {
    return await database.transaction(async (transaction) => {
      const task = await lockTask(transaction, input);
      if (!task) return { kind: "not_found" } as const;
      const insideReplay = await findCommand(transaction, input);
      if (insideReplay) return insideReplay;
      if (task.taskType !== "CHECKLIST") return { kind: "conflict" } as const;
      const completedAt = new Date();
      await completeTask(transaction, input, completedAt);
      const transition = await findTransition(
        transaction,
        task,
        input.actionKey,
      );
      const hasRemaining = await requiredTasksRemain(transaction, task.stageInstanceId);
      if (!hasRemaining && !transition) throw new WorkflowWriteConflict();
      const workflowStatus = hasRemaining
        ? "ACTIVE" as const
        : await activateNextStage(transaction, task, transition, completedAt);
      const result: TaskCompletionResult = {
        actionKey: input.actionKey,
        nextStageName: hasRemaining ? null : transition?.nextStageName ?? null,
        rowVersion: input.expectedRowVersion + 1,
        taskInstanceId: input.taskId,
        taskStatus: "COMPLETED",
        workflowStatus,
      };
      await appendCompletion(transaction, input, task, result, completedAt);
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
