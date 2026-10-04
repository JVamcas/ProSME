import "server-only";

import { sql } from "drizzle-orm";
import type { RequiredTaskCompletion } from "../domain/runtime/StageCompletion";
import type {
  StageCompletionTransaction,
  StageCompletionValueRow,
} from "./StageCompletionRepository";

export async function loadRequiredTaskCompletions(
  transaction: Pick<StageCompletionTransaction, "execute">,
  stageInstanceId: string,
  completingTaskId?: string,
  previewFormSubmission = false,
): Promise<RequiredTaskCompletion[]> {
  const rows = await loadRequiredTaskCompletionsForStages(
    transaction,
    [stageInstanceId],
    completingTaskId,
    previewFormSubmission,
  );
  return rows.map(({ stageInstanceId: _id, ...row }) => {
    void _id;
    return row;
  });
}

export async function loadStageCompletionValues(
  transaction: Pick<StageCompletionTransaction, "execute">,
  stageInstanceId: string,
): Promise<StageCompletionValueRow[]> {
  const rows = await loadStageCompletionValuesForStages(transaction, [
    stageInstanceId,
  ]);
  return rows.map(({ stageInstanceId: _id, ...row }) => {
    void _id;
    return row;
  });
}

export async function loadRequiredTaskCompletionsForStages(
  transaction: Pick<StageCompletionTransaction, "execute">,
  stageInstanceIds: string[],
  completingTaskId?: string,
  previewFormSubmission = false,
): Promise<(RequiredTaskCompletion & { stageInstanceId: string })[]> {
  if (!stageInstanceIds.length) return [];
  const formEvidenceReady = sql`(
    task.form_version_id IS NULL
    OR (
      ${previewFormSubmission}
      AND task.id = ${completingTaskId ?? null}::uuid
      AND definition.task_type = 'STAGE_DECISION'
      AND COALESCE(definition.config ->> 'command', '') <> 'AUTHORITATIVE_ELIGIBILITY'
      AND COALESCE(definition.config ->> 'formPurpose', '') <> 'ELIGIBILITY_VERIFICATION'
    )
    OR EXISTS (
      SELECT 1 FROM app_form_responses response
      WHERE response.workflow_task_id = task.id
        AND (
          response.status = 'COMPLETED'
          OR (
            (definition.config ->> 'command' = 'AUTHORITATIVE_ELIGIBILITY'
              OR definition.config ->> 'formPurpose' = 'ELIGIBILITY_VERIFICATION')
            AND response.values = (task.result -> 'evaluatedFormValues')
          )
        )
    )
  )`;
  const result = await transaction.execute(sql`
    SELECT stage.id AS "stageInstanceId", definition.id AS "taskDefinitionId",
      definition.code AS "taskKey",
      definition.required_completion_count AS "requiredCompletionCount",
      definition.completion_mode AS "completionMode",
      definition.completion_percentage AS "completionPercentage",
      definition.reviewer_count AS "denominator",
      count(task.id) FILTER (
        WHERE (task.status = 'COMPLETED'
          OR (task.id = ${completingTaskId ?? null}::uuid
            AND task.status IN ('PENDING', 'IN_PROGRESS')))
          AND app_workflow_task_coi_cleared(task.id, task.assigned_user_id)
          AND NOT EXISTS (
            SELECT 1 FROM app_workflow_tasks successor
            WHERE successor.supersedes_task_id = task.id
          )
          AND ${formEvidenceReady}
      )::integer AS "completedCount",
      COALESCE(array_agg(task.id ORDER BY task.reviewer_slot) FILTER (
        WHERE (task.status = 'COMPLETED'
          OR (task.id = ${completingTaskId ?? null}::uuid
            AND task.status IN ('PENDING', 'IN_PROGRESS')))
          AND app_workflow_task_coi_cleared(task.id, task.assigned_user_id)
          AND NOT EXISTS (
            SELECT 1 FROM app_workflow_tasks successor
            WHERE successor.supersedes_task_id = task.id
          )
          AND ${formEvidenceReady}
      ), ARRAY[]::uuid[]) AS "completedTaskIds"
    FROM app_stage_task_definitions definition
    JOIN app_workflow_stage_instances stage
      ON stage.workflow_stage_definition_id = definition.stage_id
    LEFT JOIN app_workflow_tasks task
      ON task.stage_instance_id = stage.id
      AND task.workflow_task_definition_id = definition.id
    WHERE stage.id IN (${sql.join(
      stageInstanceIds.map((id) => sql`${id}::uuid`),
      sql`, `,
    )})
      AND definition.required = TRUE
    GROUP BY stage.id, definition.id, definition.code,
      definition.required_completion_count, definition.completion_mode,
      definition.completion_percentage, definition.reviewer_count
    ORDER BY definition.sequence, definition.id
  `);
  return result.rows as (RequiredTaskCompletion & {
    stageInstanceId: string;
  })[];
}

export async function loadStageCompletionValuesForStages(
  transaction: Pick<StageCompletionTransaction, "execute">,
  stageInstanceIds: string[],
): Promise<(StageCompletionValueRow & { stageInstanceId: string })[]> {
  if (!stageInstanceIds.length) return [];
  const result = await transaction.execute(sql`
    SELECT task.stage_instance_id AS "stageInstanceId",
      task.id AS "taskId", definition.code AS "taskKey",
      task.reviewer_slot AS "reviewerSlot",
      definition.reviewer_count AS "reviewerCount",
      task.assigned_user_id AS "reviewerId",
      task.result AS "taskResult", response.values AS "responseValues"
    FROM app_workflow_tasks task
    JOIN app_stage_task_definitions definition
      ON definition.id = task.workflow_task_definition_id
    LEFT JOIN LATERAL (
      SELECT submitted.id, submitted.values, submitted.created_at
      FROM app_form_responses submitted
      WHERE submitted.workflow_task_id = task.id
        AND (submitted.status = 'COMPLETED'
          OR submitted.values = (task.result -> 'evaluatedFormValues'))
      ORDER BY submitted.updated_at DESC, submitted.id DESC
      LIMIT 1
    ) response ON TRUE
    WHERE task.stage_instance_id IN (${sql.join(
      stageInstanceIds.map((id) => sql`${id}::uuid`),
      sql`, `,
    )})
      AND task.status = 'COMPLETED'
      AND app_workflow_task_coi_cleared(task.id, task.assigned_user_id)
      AND NOT EXISTS (
        SELECT 1 FROM app_workflow_tasks successor
        WHERE successor.supersedes_task_id = task.id
      )
      AND (task.form_version_id IS NULL OR response.id IS NOT NULL)
    ORDER BY task.created_at, task.id, response.created_at, response.id
  `);
  return result.rows as (StageCompletionValueRow & {
    stageInstanceId: string;
  })[];
}
