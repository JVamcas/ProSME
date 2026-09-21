import "server-only";

import { sql } from "drizzle-orm";

import type { WorkflowInstanceTransaction } from "./WorkflowInstanceRepository";

type RuntimeAuditTransaction = Pick<WorkflowInstanceTransaction, "execute">;

export async function appendTaskCompletionAndActionAudit(
  transaction: RuntimeAuditTransaction,
  input: {
    actionKey: string;
    actorId: string;
    beforeRowVersion: number;
    beforeStatus?: string;
    completedAt: Date;
    correlationId: string;
    idempotencyKey: string;
    stageInstanceId: string;
    taskId: string;
    workflowInstanceId: string;
  },
) {
  const completion = {
    actionKey: input.actionKey,
    completedAt: input.completedAt.toISOString(),
    rowVersion: input.beforeRowVersion + 1,
    status: "COMPLETED",
  };
  const before = {
    rowVersion: input.beforeRowVersion,
    ...(input.beforeStatus ? { status: input.beforeStatus } : {}),
  };
  await transaction.execute(sql`
    INSERT INTO app_workflow_events
      (workflow_instance_id, event_code, actor_id, correlation_id, payload)
    VALUES (${input.workflowInstanceId}::uuid, 'TASK_COMPLETED',
      ${input.actorId}::uuid, ${input.correlationId}::uuid,
      ${JSON.stringify(completion)}::jsonb),
      (${input.workflowInstanceId}::uuid, 'ACTION_EXECUTED',
      ${input.actorId}::uuid, ${input.correlationId}::uuid,
      jsonb_build_object(
        'actionKey', ${input.actionKey}::text,
        'stageInstanceId', ${input.stageInstanceId}::text,
        'taskId', ${input.taskId}::text
      ))
  `);
  await transaction.execute(sql`
    INSERT INTO app_workflow_audit_entries
      (actor_id, action, target_type, target_id, correlation_id,
       idempotency_key, workflow_instance_id, stage_instance_id, task_id,
       reason, before, after)
    VALUES
      (${input.actorId}::uuid, 'TASK_COMPLETED', 'WORKFLOW_TASK',
       ${input.taskId}, ${input.correlationId}::uuid, ${input.idempotencyKey},
       ${input.workflowInstanceId}::uuid, ${input.stageInstanceId}::uuid,
       ${input.taskId}::uuid, NULL, ${JSON.stringify(before)}::jsonb,
       ${JSON.stringify(completion)}::jsonb),
      (${input.actorId}::uuid, 'ACTION_EXECUTED', 'WORKFLOW_TASK',
       ${input.taskId}, ${input.correlationId}::uuid,
       ${`${input.idempotencyKey}:action`},
       ${input.workflowInstanceId}::uuid, ${input.stageInstanceId}::uuid,
       ${input.taskId}::uuid, ${input.actionKey}, NULL,
       jsonb_build_object('actionKey', ${input.actionKey}::text))
  `);
}
