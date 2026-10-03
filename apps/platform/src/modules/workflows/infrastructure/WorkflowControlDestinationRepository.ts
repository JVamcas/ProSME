import "server-only";

import { sql } from "drizzle-orm";

import type { StageCompletionTransaction } from "./StageCompletionRepository";

export type WorkflowControlDestination = {
  id: string;
  name: string;
  stableKey: string;
};

/** Resolve destinations in the instance's pinned definition, never another version. */
export async function readWorkflowControlDestinations(
  database: Pick<StageCompletionTransaction, "execute">,
  input: {
    actionType: "RETURN";
    sourceStageInstanceId: string;
    workflowInstanceId: string;
    targetStageDefinitionId?: string;
  },
): Promise<WorkflowControlDestination[]> {
  const result = await database.execute<WorkflowControlDestination>(sql`
    WITH RECURSIVE progression AS (
      SELECT transition.from_stage_id, target.target_stage_id
      FROM app_workflow_transition_definitions transition
      JOIN app_workflow_transition_targets target ON target.transition_id = transition.id
      JOIN app_workflow_stage_definitions origin
        ON origin.id = transition.from_stage_id AND origin.version_id = transition.version_id
      JOIN app_workflow_stage_definitions destination
        ON destination.id = target.target_stage_id AND destination.version_id = transition.version_id
      JOIN app_workflow_action_definitions action
        ON action.stage_id = transition.from_stage_id
        AND action.stable_key = transition.action_key
      JOIN app_workflow_instances workflow
        ON workflow.workflow_template_version_id = transition.version_id
      WHERE workflow.id = ${input.workflowInstanceId}::uuid
        AND action.action_type NOT IN ('RETURN', 'REFER')
    ), upstream(stage_id) AS (
      SELECT source.workflow_stage_definition_id
      FROM app_workflow_stage_instances source
      WHERE source.id = ${input.sourceStageInstanceId}::uuid
        AND source.workflow_instance_id = ${input.workflowInstanceId}::uuid
      UNION
      SELECT progression.from_stage_id
      FROM progression JOIN upstream ON progression.target_stage_id = upstream.stage_id
    ), downstream(stage_id) AS (
      SELECT source.workflow_stage_definition_id
      FROM app_workflow_stage_instances source
      WHERE source.id = ${input.sourceStageInstanceId}::uuid
        AND source.workflow_instance_id = ${input.workflowInstanceId}::uuid
      UNION
      SELECT progression.target_stage_id
      FROM progression JOIN downstream ON progression.from_stage_id = downstream.stage_id
    )
    SELECT destination.id, destination.name, destination.code AS "stableKey"
    FROM app_workflow_stage_instances source
    JOIN app_workflow_instances workflow ON workflow.id = source.workflow_instance_id
    JOIN app_workflow_stage_definitions destination
      ON destination.version_id = workflow.workflow_template_version_id
    WHERE source.id = ${input.sourceStageInstanceId}::uuid
      AND workflow.id = ${input.workflowInstanceId}::uuid
      AND workflow.status = 'ACTIVE'
      AND source.status = 'ACTIVE'
      AND destination.enabled = TRUE
      AND destination.id <> source.workflow_stage_definition_id
      AND destination.id IN (SELECT stage_id FROM upstream)
      AND EXISTS (
        SELECT 1 FROM progression previous_step
        WHERE previous_step.from_stage_id = destination.id
          AND previous_step.target_stage_id = source.workflow_stage_definition_id
      )
      AND destination.id NOT IN (SELECT stage_id FROM downstream)
      AND (${input.targetStageDefinitionId ?? null}::uuid IS NULL
        OR destination.id = ${input.targetStageDefinitionId ?? null}::uuid)
      AND EXISTS (
        SELECT 1 FROM app_stage_task_definitions task
        WHERE task.stage_id = destination.id
      )
      AND EXISTS (
          SELECT 1 FROM app_workflow_stage_instances previous
          WHERE previous.workflow_instance_id = workflow.id
            AND previous.workflow_stage_definition_id = destination.id
            AND previous.activated_at < source.activated_at
            AND previous.status = 'COMPLETED'
        )
        AND NOT EXISTS (
          SELECT 1 FROM app_workflow_stage_instances ongoing
          WHERE ongoing.workflow_instance_id = workflow.id
            AND ongoing.workflow_stage_definition_id = destination.id
            AND ongoing.status IN ('ACTIVE', 'BLOCKED')
        )
    ORDER BY destination.sequence, destination.code, destination.id
  `);
  return result.rows;
}
