import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  workflowAuditEntries,
  workflowEvents,
  workflowTasks,
} from "@/db/schema";
import { taskWorkIsReady } from "@/modules/workflows/WorkflowTaskRegistry";
import { appendTaskCompletionAudit } from "@/modules/workflows/infrastructure/RuntimeAuditWriteRepository";

type Transaction = Parameters<
  Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]
>[0];

type CompletionInput = {
  commandKey: string;
  correlationId: string;
  evaluatedFormValues?: Record<string, unknown>;
  expectedRowVersion: number;
  stageInstanceId: string;
  taskId: string;
  workflowInstanceId: string;
};

export async function persistAuthoritativeEligibilityTaskCompletion(
  transaction: Transaction,
  input: CompletionInput,
  result: Record<string, unknown>,
  evaluatedBy: string,
) {
  const workRows = await transaction.execute(sql`
    SELECT definition.config, definition.task_type AS "taskType",
      task.result, task.status,
      task.form_version_id IS NOT NULL AS "formRequired",
      EXISTS (
        SELECT 1 FROM app_form_responses response
        WHERE response.workflow_task_id = task.id
          AND (response.status = 'COMPLETED'
            OR response.values = ${JSON.stringify(input.evaluatedFormValues ?? {})}::jsonb)
      ) AS "formCompleted",
      EXISTS (
        SELECT 1 FROM app_workflow_stage_checklist_definitions checklist
        WHERE checklist.task_definition_id = definition.id
      ) AS "hasChecklist"
    FROM app_workflow_tasks task
    JOIN app_stage_task_definitions definition
      ON definition.id = task.workflow_task_definition_id
    WHERE task.id = ${input.taskId}::uuid
  `);
  const work = workRows.rows[0] as
    | {
        config: unknown;
        formCompleted: boolean;
        formRequired: boolean;
        hasChecklist: boolean;
        result: unknown;
        status: string;
        taskType: "CONTRIBUTING" | "STAGE_DECISION";
      }
    | undefined;
  if (!work) {
    throw new Error("Authoritative eligibility task no longer exists.");
  }

  const priorResult =
    work.result &&
    typeof work.result === "object" &&
    !Array.isArray(work.result)
      ? (work.result as Record<string, unknown>)
      : {};
  const completesTask =
    work.taskType === "CONTRIBUTING" &&
    taskWorkIsReady({
      config: work.config,
      formCompleted: work.formCompleted,
      formRequired: work.formRequired,
      hasChecklist: work.hasChecklist,
      result: { ...priorResult, ...result },
    });
  const completedAt = completesTask ? new Date() : null;
  const [updated] = await transaction
    .update(workflowTasks)
    .set({
      completedAt,
      result: sql`COALESCE(${workflowTasks.result}, '{}'::jsonb)
        || ${JSON.stringify({
          ...result,
          ...(input.evaluatedFormValues
            ? { evaluatedFormValues: input.evaluatedFormValues }
            : {}),
        })}::jsonb`,
      rowVersion: input.expectedRowVersion + 1,
      status: completesTask ? "COMPLETED" : "IN_PROGRESS",
    })
    .where(
      and(
        eq(workflowTasks.id, input.taskId),
        eq(workflowTasks.rowVersion, input.expectedRowVersion),
      ),
    )
    .returning({ rowVersion: workflowTasks.rowVersion });
  if (!updated) {
    throw new Error("Authoritative eligibility task write conflict.");
  }

  if (completedAt && work.status !== "COMPLETED") {
    await appendTaskCompletionAudit(transaction, {
      actorId: evaluatedBy,
      beforeRowVersion: input.expectedRowVersion,
      beforeStatus: work.status,
      completedAt,
      correlationId: input.correlationId,
      idempotencyKey: `${input.commandKey}:task`,
      stageInstanceId: input.stageInstanceId,
      taskId: input.taskId,
      workflowInstanceId: input.workflowInstanceId,
    });
  }

  await Promise.all([
    transaction.insert(workflowEvents).values({
      actorId: evaluatedBy,
      correlationId: input.correlationId,
      eventCode: "AUTHORITATIVE_ELIGIBILITY_EVALUATED",
      payload: result,
      workflowInstanceId: input.workflowInstanceId,
    }),
    transaction.insert(workflowAuditEntries).values({
      action: "AUTHORITATIVE_ELIGIBILITY_EVALUATED",
      actorId: evaluatedBy,
      after: result,
      before: null,
      correlationId: input.correlationId,
      idempotencyKey: input.commandKey,
      stageInstanceId: input.stageInstanceId,
      targetId: String(result.evaluationId),
      targetType: "ELIGIBILITY_EVALUATION",
      taskId: input.taskId,
      workflowInstanceId: input.workflowInstanceId,
    }),
  ]);
  return updated.rowVersion;
}
