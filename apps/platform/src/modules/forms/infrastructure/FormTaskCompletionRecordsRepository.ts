import "server-only";

import { sql } from "drizzle-orm";

import type {
  FormTaskCompletionInput,
  FormTaskCompletionResult,
  FormTaskCompletionTransaction,
} from "./FormTaskCompletionTypes";

export class FormTaskCommandKeyConflict extends Error {}

export async function appendFormTaskCompletionRecords(
  transaction: FormTaskCompletionTransaction,
  input: FormTaskCompletionInput,
  result: FormTaskCompletionResult,
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
  if (!command.rowCount) throw new FormTaskCommandKeyConflict();
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
        'rowVersion', ${response.rowVersion}::integer,
        'status', 'COMPLETED',
        'values', ${JSON.stringify(input.values)}::jsonb,
        'workflowTaskId', ${input.taskInstanceId}::text
      ))
  `);
  await transaction.execute(sql`
    INSERT INTO app_transactional_outbox
      (event_code, aggregate_id, schema_version, payload, correlation_id)
    VALUES (${result.taskStatus === "COMPLETED" ? "FORM_TASK_COMPLETED" : "FORM_RESPONSE_COMPLETED"}, ${input.taskInstanceId}::uuid, 1,
      ${JSON.stringify(result)}::jsonb, ${input.correlationId}::uuid)
  `);
}
