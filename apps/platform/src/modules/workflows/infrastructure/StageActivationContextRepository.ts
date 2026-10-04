import "server-only";

import { sql } from "drizzle-orm";
import {
  buildStageCompletionValues,
  type StageCompletionSubmission,
} from "../engine/StageCompletionContext";

import type { StageActivationTransaction } from "./StageActivationRepository";

export type PriorStageActivationContext = {
  stableKey: string;
  values: Record<string, unknown>;
};

type PriorStageRow = StageCompletionSubmission & { stageKey: string };

export async function loadPriorStageContext(
  transaction: Pick<StageActivationTransaction, "execute">,
  workflowInstanceId: string,
): Promise<PriorStageActivationContext[]> {
  const result = await transaction.execute(sql`
    WITH latest_completed_stage AS (
      SELECT DISTINCT ON (definition.code)
        stage.id,
        definition.code
      FROM app_workflow_stage_instances stage
      JOIN app_workflow_stage_definitions definition
        ON definition.id = stage.workflow_stage_definition_id
      WHERE stage.workflow_instance_id = ${workflowInstanceId}::uuid
        AND stage.status = 'COMPLETED'
      ORDER BY definition.code, stage.iteration_number DESC,
        stage.completed_at DESC, stage.id DESC
    )
    SELECT latest.code AS "stageKey",
      task.id AS "taskId", definition.stable_key AS "taskKey",
      task.reviewer_slot AS "reviewerSlot",
      definition.reviewer_count AS "reviewerCount",
      task.assigned_user_id AS "reviewerId",
      response.values AS "responseValues", task.result AS "taskResult"
    FROM latest_completed_stage latest
    LEFT JOIN app_workflow_tasks task
      ON task.stage_instance_id = latest.id
      AND task.status = 'COMPLETED'
      AND app_workflow_task_coi_cleared(task.id, task.assigned_user_id)
      AND NOT EXISTS (
        SELECT 1 FROM app_workflow_tasks successor
        WHERE successor.supersedes_task_id = task.id
      )
      AND (task.form_version_id IS NULL OR EXISTS (
        SELECT 1 FROM app_form_responses submitted
        WHERE submitted.workflow_task_id = task.id
          AND submitted.status = 'COMPLETED'
      ))
    LEFT JOIN app_stage_task_definitions definition
      ON definition.id = task.workflow_task_definition_id
    LEFT JOIN LATERAL (
      SELECT submitted.values FROM app_form_responses submitted
      WHERE submitted.workflow_task_id = task.id AND submitted.status = 'COMPLETED'
      ORDER BY submitted.updated_at DESC, submitted.id DESC LIMIT 1
    ) response ON TRUE
    ORDER BY latest.code, task.created_at, task.id
  `);
  const stages = new Map<string, PriorStageRow[]>();
  for (const row of result.rows as PriorStageRow[]) {
    const submissions = stages.get(row.stageKey) ?? [];
    submissions.push(row);
    stages.set(row.stageKey, submissions);
  }
  return [...stages].map(([stableKey, submissions]) => ({
    stableKey,
    values: buildStageCompletionValues(submissions),
  }));
}
