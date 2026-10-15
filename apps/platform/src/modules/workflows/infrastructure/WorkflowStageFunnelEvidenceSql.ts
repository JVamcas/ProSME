import "server-only";
import { sql } from "drizzle-orm";

// Operates only on the bounded page_runs CTE. Draft and superseded reviews are
// excluded. A reviewing actor cannot use reporting to bypass peer release.
export function workflowStageFunnelEvidence(actorId: string) {
  return sql`
    evidence_tasks AS (
      SELECT task.id, task.stage_instance_id, task.workflow_task_definition_id,
        task.result, definition.name, response.values AS form_values,
        response.definition_snapshot AS form_snapshot
      FROM page_runs run
      JOIN app_workflow_tasks task ON task.stage_instance_id = run.stage_id
      JOIN app_stage_task_definitions definition ON definition.id = task.workflow_task_definition_id
      LEFT JOIN app_form_responses response ON response.workflow_task_id = task.id
        AND response.respondent_user_id = task.assigned_user_id
        AND response.status = 'COMPLETED'
      WHERE task.status = 'COMPLETED'
        AND app_workflow_task_coi_cleared(task.id, task.assigned_user_id)
        AND NOT EXISTS (SELECT 1 FROM app_workflow_tasks successor
          WHERE successor.supersedes_task_id = task.id)
        AND (task.form_version_id IS NULL OR response.id IS NOT NULL)
        AND (
          definition.reviewer_count <= 1 OR task.assigned_user_id = ${actorId}::uuid
          OR definition.review_release = 'IMMEDIATE'
          OR run.status = 'COMPLETED'
          OR EXISTS (SELECT 1 FROM app_workflow_reworks rework
            WHERE rework.source_stage_instance_id = run.stage_id)
          OR (definition.review_release = 'THRESHOLD_MET' AND EXISTS (
            SELECT 1 FROM app_workflow_review_threshold_evaluations evaluation
            WHERE evaluation.stage_instance_id = run.stage_id
              AND evaluation.task_definition_id = definition.id
              AND evaluation.first_satisfied = true
          ))
          OR NOT EXISTS (SELECT 1 FROM app_workflow_tasks own_task
            WHERE own_task.stage_instance_id = run.stage_id
              AND own_task.workflow_task_definition_id = definition.id
              AND own_task.assigned_user_id = ${actorId}::uuid)
        )
    ), form_scores AS (
      SELECT task.id, aggregate_field->>'key' AS aggregate_key,
        sum(
          CASE WHEN aggregate_field->'scoringAggregate'->>'normalization' = 'PERCENTAGE'
            THEN (task.form_values->>(source->>'fieldKey'))::numeric
              / NULLIF((field->>'maximum')::numeric, 0) * 100
            ELSE (task.form_values->>(source->>'fieldKey'))::numeric END
          * CASE WHEN aggregate_field->'scoringAggregate'->>'method' IN ('WEIGHTED_SUM','WEIGHTED_AVERAGE')
            THEN (source->>'weight')::numeric ELSE 1 END
        ) / NULLIF(sum(
          CASE WHEN aggregate_field->'scoringAggregate'->>'normalization' = 'PERCENTAGE'
            THEN 100 ELSE (field->>'maximum')::numeric END
          * CASE WHEN aggregate_field->'scoringAggregate'->>'method' IN ('WEIGHTED_SUM','WEIGHTED_AVERAGE')
            THEN (source->>'weight')::numeric ELSE 1 END
        ), 0) * 100 AS percentage
      FROM evidence_tasks task
      CROSS JOIN LATERAL jsonb_array_elements(COALESCE(task.form_snapshot->'fields', '[]')) aggregate_field
      CROSS JOIN LATERAL jsonb_array_elements(aggregate_field->'scoringAggregate'->'sources') source
      JOIN LATERAL jsonb_array_elements(task.form_snapshot->'fields') field
        ON field->>'key' = source->>'fieldKey' AND field->>'type' = 'SCORE'
      WHERE aggregate_field->>'type' = 'SCORING_AGGREGATE'
        AND jsonb_typeof(task.form_values->(source->>'fieldKey')) = 'number'
      GROUP BY task.id, aggregate_field
      HAVING aggregate_field->'scoringAggregate'->>'missing' <> 'REQUIRE_ALL'
        OR count(*) = jsonb_array_length(aggregate_field->'scoringAggregate'->'sources')
    ), legacy_scores AS (
      SELECT task.id,
        sum((score->>'score')::numeric * CASE
          WHEN config.aggregation IN ('WEIGHTED_AVERAGE','WEIGHTED_SUM') THEN criterion.weight ELSE 1 END)
        / NULLIF(sum(criterion.scale_maximum * CASE
          WHEN config.aggregation IN ('WEIGHTED_AVERAGE','WEIGHTED_SUM') THEN criterion.weight ELSE 1 END), 0)
        * 100 AS percentage
      FROM evidence_tasks task
      JOIN app_workflow_stage_scoring_configurations config
        ON config.task_definition_id = task.workflow_task_definition_id
      JOIN app_workflow_stage_scoring_criteria criterion
        ON criterion.task_definition_id = config.task_definition_id
      JOIN LATERAL jsonb_array_elements(COALESCE(task.result->'scores', '[]')) score
        ON score->>'criterion' = criterion.stable_key
      WHERE task.form_snapshot IS NULL AND jsonb_typeof(score->'score') = 'number'
      GROUP BY task.id
    ), standalone_form_scores AS (
      SELECT task.id,
        avg((task.form_values->>(field->>'key'))::numeric
          / NULLIF((field->>'maximum')::numeric, 0) * 100) AS percentage
      FROM evidence_tasks task
      CROSS JOIN LATERAL jsonb_array_elements(COALESCE(task.form_snapshot->'fields', '[]')) field
      WHERE field->>'type' = 'SCORE'
        AND jsonb_typeof(task.form_values->(field->>'key')) = 'number'
        AND NOT EXISTS (
          SELECT 1 FROM jsonb_array_elements(task.form_snapshot->'fields') aggregate_field
          WHERE aggregate_field->>'type' = 'SCORING_AGGREGATE'
        )
      GROUP BY task.id
    ), task_scores AS (
      SELECT id, avg(percentage) AS percentage FROM form_scores GROUP BY id
      UNION ALL SELECT id, percentage FROM legacy_scores
      UNION ALL SELECT id, percentage FROM standalone_form_scores
    ), stage_scores AS (
      SELECT task.stage_instance_id, round(avg(score.percentage)::numeric, 2) AS average_score
      FROM evidence_tasks task JOIN task_scores score ON score.id = task.id
      GROUP BY task.stage_instance_id
    ), comment_values AS (
      SELECT task.stage_instance_id, task.name AS task_name,
        field->>'label' AS label, task.form_values->>(field->>'key') AS value
      FROM evidence_tasks task
      CROSS JOIN LATERAL jsonb_array_elements(COALESCE(task.form_snapshot->'fields', '[]')) field
      WHERE field->>'type' = 'TEXTAREA'
        AND jsonb_typeof(task.form_values->(field->>'key')) = 'string'
      UNION ALL
      SELECT task.stage_instance_id, task.name, COALESCE(field.label, 'Comment'), item->>'value'
      FROM evidence_tasks task
      CROSS JOIN LATERAL jsonb_array_elements(COALESCE(task.result->'comments', '[]')) item
      LEFT JOIN app_workflow_stage_comment_fields field
        ON field.task_definition_id = task.workflow_task_definition_id AND field.key = item->>'key'
      WHERE task.form_snapshot IS NULL
      UNION ALL
      SELECT task.stage_instance_id, task.name, COALESCE(criterion.criterion, 'Score comment'), item->>'comment'
      FROM evidence_tasks task
      CROSS JOIN LATERAL jsonb_array_elements(COALESCE(task.result->'scores', '[]')) item
      LEFT JOIN app_workflow_stage_scoring_criteria criterion
        ON criterion.task_definition_id = task.workflow_task_definition_id AND criterion.stable_key = item->>'criterion'
      WHERE task.form_snapshot IS NULL
    ), stage_comments AS (
      SELECT stage_instance_id,
        string_agg(task_name || ' — ' || COALESCE(label || ': ', '') || value,
          E'\n' ORDER BY task_name, label, value) AS comments
      FROM comment_values WHERE NULLIF(trim(value), '') IS NOT NULL
      GROUP BY stage_instance_id
    )
  `;
}
