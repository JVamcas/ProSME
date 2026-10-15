import "server-only";
import { sql } from "drizzle-orm";

// Completed form aggregates are calculated on the server when responses are saved.
// Read that result; derive only its scale from the exact response snapshot.
export function workflowStageFunnelScores() {
  return sql`
    form_scores AS (
      SELECT task.id,
        (task.form_values->>(aggregate_field->>'key'))::numeric AS value,
        CASE WHEN aggregate_field->'scoringAggregate'->>'normalization' = 'PERCENTAGE'
          THEN 'PERCENTAGE' ELSE 'POINTS' END AS unit,
        round(sum(
          CASE WHEN aggregate_field->'scoringAggregate'->>'normalization' = 'PERCENTAGE'
            THEN 100 ELSE (field->>'maximum')::numeric END
          * CASE WHEN aggregate_field->'scoringAggregate'->>'method' IN ('WEIGHTED_SUM','WEIGHTED_AVERAGE')
            THEN (source->>'weight')::numeric ELSE 1 END
        ) / NULLIF(CASE aggregate_field->'scoringAggregate'->>'method'
          WHEN 'AVERAGE' THEN count(*)::numeric
          WHEN 'WEIGHTED_AVERAGE' THEN sum((source->>'weight')::numeric)
          ELSE 1 END, 0), COALESCE((aggregate_field->'scoringAggregate'->>'precision')::integer, 2)) AS maximum
      FROM evidence_tasks task
      CROSS JOIN LATERAL jsonb_array_elements(COALESCE(task.form_snapshot->'fields', '[]')) aggregate_field
      CROSS JOIN LATERAL jsonb_array_elements(aggregate_field->'scoringAggregate'->'sources') source
      JOIN LATERAL jsonb_array_elements(task.form_snapshot->'fields') field
        ON field->>'key' = source->>'fieldKey' AND field->>'type' = 'SCORE'
      WHERE aggregate_field->>'type' = 'SCORING_AGGREGATE'
        AND jsonb_typeof(task.form_values->(aggregate_field->>'key')) = 'number'
        AND jsonb_typeof(task.form_values->(source->>'fieldKey')) = 'number'
        AND (SELECT count(*) FROM jsonb_array_elements(task.form_snapshot->'fields') candidate
          WHERE candidate->>'type' = 'SCORING_AGGREGATE') = 1
      GROUP BY task.id, task.form_values, aggregate_field
      HAVING aggregate_field->'scoringAggregate'->>'missing' <> 'REQUIRE_ALL'
        OR count(*) = jsonb_array_length(aggregate_field->'scoringAggregate'->'sources')
    ), legacy_scores AS (
      SELECT task.id, 'POINTS' AS unit,
        sum((score->>'score')::numeric * CASE
          WHEN config.aggregation IN ('WEIGHTED_AVERAGE','WEIGHTED_SUM') THEN criterion.weight ELSE 1 END)
        / NULLIF(CASE config.aggregation
          WHEN 'AVERAGE' THEN count(*)::numeric
          WHEN 'WEIGHTED_AVERAGE' THEN sum(criterion.weight)
          ELSE 1 END, 0) AS value,
        sum(criterion.scale_maximum * CASE
          WHEN config.aggregation IN ('WEIGHTED_AVERAGE','WEIGHTED_SUM') THEN criterion.weight ELSE 1 END)
        / NULLIF(CASE config.aggregation
          WHEN 'AVERAGE' THEN count(*)::numeric
          WHEN 'WEIGHTED_AVERAGE' THEN sum(criterion.weight)
          ELSE 1 END, 0) AS maximum
      FROM evidence_tasks task
      JOIN app_workflow_stage_scoring_configurations config
        ON config.task_definition_id = task.workflow_task_definition_id
      JOIN app_workflow_stage_scoring_criteria criterion
        ON criterion.task_definition_id = config.task_definition_id
      JOIN LATERAL jsonb_array_elements(COALESCE(task.result->'scores', '[]')) score
        ON score->>'criterion' = criterion.stable_key
      WHERE task.form_snapshot IS NULL AND jsonb_typeof(score->'score') = 'number'
        AND config.aggregation IN ('SUM', 'AVERAGE', 'WEIGHTED_SUM', 'WEIGHTED_AVERAGE')
      GROUP BY task.id, config.aggregation
    ), task_scores AS (
      SELECT id, value, maximum, unit FROM form_scores
      UNION ALL SELECT id, value, maximum, unit FROM legacy_scores
    ), stage_scores AS (
      SELECT task.stage_instance_id,
        round(avg(score.value)::numeric, 2) AS average_score,
        min(score.maximum) AS score_maximum, min(score.unit) AS score_unit
      FROM evidence_tasks task JOIN task_scores score ON score.id = task.id
      WHERE score.value IS NOT NULL AND score.maximum > 0
      GROUP BY task.stage_instance_id
      HAVING count(DISTINCT (score.maximum, score.unit)) = 1
    )
  `;
}
