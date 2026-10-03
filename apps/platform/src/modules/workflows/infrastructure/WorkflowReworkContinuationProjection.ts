import "server-only";

import { sql, type SQL } from "drizzle-orm";

/** Unwind completed nested returns before continuing the outer correction. */
export function workflowReworkContinuationContext(
  context: SQL,
  workflowId: SQL,
  stageDefinitionId: SQL,
) {
  return sql<Record<string, unknown> | null>`(
    WITH RECURSIVE ancestry(context, origin_id, visited) AS (
      SELECT ${context}, (${context} ->> 'sourceStageInstanceId')::uuid, ARRAY[]::uuid[]
      UNION ALL
      SELECT origin.return_context,
        (origin.return_context ->> 'sourceStageInstanceId')::uuid,
        ancestry.visited || origin.id
      FROM ancestry
      JOIN app_workflow_stage_instances origin ON origin.id = ancestry.origin_id
      WHERE origin.workflow_instance_id = ${workflowId}
        AND origin.workflow_stage_definition_id = ${stageDefinitionId}
        AND NOT origin.id = ANY(ancestry.visited)
    )
    SELECT ancestry.context
    FROM ancestry
    JOIN app_workflow_stage_instances origin ON origin.id = ancestry.origin_id
    WHERE origin.workflow_instance_id = ${workflowId}
      AND origin.workflow_stage_definition_id <> ${stageDefinitionId}
    ORDER BY cardinality(ancestry.visited)
    LIMIT 1
  )`;
}
