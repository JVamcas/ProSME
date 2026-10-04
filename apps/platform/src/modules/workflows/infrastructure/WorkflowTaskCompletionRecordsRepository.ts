import "server-only";

import { sql } from "drizzle-orm";
import { resolveCompletedTaskEscalation } from "./WorkflowEscalationRepository";

import type { getDatabase } from "@/db/client";
import type {
  ChecklistResultItem,
  CommentResultItem,
  DocumentResultItem,
  ScoreResultItem,
  TaskCompletionResult,
} from "@/modules/work-queue/TaskTypes";

type Transaction = Parameters<
  Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]
>[0];

type CompletionRecordInput = {
  actionKey: string | null;
  actorId: string;
  comments?: CommentResultItem[];
  correlationId: string;
  documents?: DocumentResultItem[];
  idempotencyKey: string;
  items: ChecklistResultItem[];
  scores?: ScoreResultItem[];
  taskId: string;
};

export class WorkflowTaskCommandKeyConflict extends Error {}

export async function appendWorkflowTaskCompletionRecords(
  transaction: Transaction,
  input: CompletionRecordInput,
  result: TaskCompletionResult,
  completedAt: Date,
) {
  const command = await transaction.execute(sql`
    INSERT INTO app_task_completion_commands
      (idempotency_key, task_instance_id, actor_id, result, completed_at,
       row_version, next_stage_name, workflow_status)
    VALUES (${input.idempotencyKey}, ${input.taskId}::uuid, ${input.actorId}::uuid,
      ${JSON.stringify({
        actionKey: input.actionKey,
        comments: input.comments ?? [],
        documents: input.documents ?? [],
        items: input.items,
        scores: input.scores ?? [],
        taskStatus: result.taskStatus,
      })}::jsonb, ${completedAt},
      ${result.rowVersion}, ${result.nextStageName}, ${result.workflowStatus})
    ON CONFLICT (idempotency_key) DO NOTHING RETURNING idempotency_key
  `);
  if (!command.rowCount) throw new WorkflowTaskCommandKeyConflict();
  await transaction.execute(sql`
    INSERT INTO app_transactional_outbox
      (event_code, aggregate_id, schema_version, payload, correlation_id)
    VALUES (${result.taskStatus === "COMPLETED" ? "TASK_COMPLETED" : "CHECKLIST_COMPLETED"}, ${input.taskId}::uuid, 1,
      ${JSON.stringify(result)}::jsonb, ${input.correlationId}::uuid)
    ON CONFLICT (event_code, aggregate_id) DO NOTHING
  `);
  if (result.taskStatus === "COMPLETED") {
    await resolveCompletedTaskEscalation(transaction, input);
  }

}
