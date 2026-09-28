import "server-only";

import { sql } from "drizzle-orm";

import type {
  PriorStageActivationContext,
  StageActivationTransaction,
} from "./StageActivationRepository";

type PriorStageRow = {
  result: Record<string, unknown> | null;
  stageKey: string;
  values: Record<string, unknown> | null;
};

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
      response.values,
      task.result
    FROM latest_completed_stage latest
    LEFT JOIN app_workflow_tasks task
      ON task.stage_instance_id = latest.id
      AND task.status = 'COMPLETED'
      AND (task.form_version_id IS NULL OR EXISTS (
        SELECT 1 FROM app_form_responses submitted
        WHERE submitted.workflow_task_id = task.id
          AND submitted.status = 'COMPLETED'
      ))
    LEFT JOIN app_form_responses response
      ON response.workflow_task_id = task.id
      AND response.status = 'COMPLETED'
    ORDER BY latest.code, task.created_at, task.id
  `);
  const stages = new Map<string, Record<string, unknown>>();
  for (const row of result.rows as PriorStageRow[]) {
    const values = stages.get(row.stageKey) ?? {};
    Object.assign(values, row.values ?? {}, row.result ?? {});
    stages.set(row.stageKey, values);
  }
  return [...stages].map(([stableKey, values]) => ({ stableKey, values }));
}
