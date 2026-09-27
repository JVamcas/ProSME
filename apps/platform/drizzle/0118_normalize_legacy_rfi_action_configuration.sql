ALTER TABLE app_workflow_action_definitions
  DISABLE TRIGGER app_workflow_actions_immutable;
--> statement-breakpoint
WITH legacy_rfi AS (
  SELECT action.id,
    action.configuration,
    CASE
      WHEN jsonb_typeof(action.configuration->'deadlineDays') = 'number'
        AND length(action.configuration->>'deadlineDays') <= 3
        AND action.configuration->>'deadlineDays' ~ '^[0-9]+$'
        AND (action.configuration->>'deadlineDays')::integer BETWEEN 1 AND 365
      THEN (action.configuration->>'deadlineDays')::integer
      ELSE 10
    END AS deadline_days,
    CASE
      WHEN jsonb_typeof(action.configuration->'editableFieldPaths') = 'array'
      THEN action.configuration->'editableFieldPaths'
      WHEN jsonb_typeof(action.configuration->'editableFieldKeys') = 'array'
      THEN action.configuration->'editableFieldKeys'
      ELSE '[]'::jsonb
    END AS editable_field_paths,
    CASE
      WHEN jsonb_typeof(action.configuration->'reminderDayOffsets') = 'array'
      THEN action.configuration->'reminderDayOffsets'
      ELSE '[]'::jsonb
    END AS reminder_day_offsets
  FROM app_workflow_action_definitions action
  WHERE action.action_type = 'REQUEST_INFORMATION'
    AND (
      action.configuration ? 'editableFieldKeys'
      OR NOT action.configuration ?& ARRAY[
        'continuation',
        'deadlineDays',
        'editableFieldPaths',
        'reminderDayOffsets',
        'expiryAction',
        'participantScope',
        'recipientScope'
      ]
    )
), normalized_rfi AS (
  SELECT legacy.id,
    legacy.configuration,
    legacy.deadline_days,
    COALESCE((
      SELECT jsonb_agg(path ORDER BY first_position)
      FROM (
        SELECT btrim(candidate.value) AS path,
          min(candidate.ordinality) AS first_position
        FROM jsonb_array_elements_text(legacy.editable_field_paths)
          WITH ORDINALITY AS candidate(value, ordinality)
        WHERE length(btrim(candidate.value)) BETWEEN 1 AND 200
          AND btrim(candidate.value)
            ~ '^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)*$'
        GROUP BY btrim(candidate.value)
        ORDER BY first_position
        LIMIT 100
      ) valid_paths
    ), '["CLARIFICATION_RESPONSE"]'::jsonb) AS editable_field_paths,
    COALESCE((
      SELECT jsonb_agg(offset_days ORDER BY offset_days)
      FROM (
        SELECT DISTINCT candidate.value::integer AS offset_days
        FROM jsonb_array_elements_text(legacy.reminder_day_offsets)
          AS candidate(value)
        WHERE length(candidate.value) <= 3
          AND candidate.value ~ '^[0-9]+$'
          AND candidate.value::integer > 0
          AND candidate.value::integer < legacy.deadline_days
          AND candidate.value::integer <= 365
        ORDER BY offset_days
        LIMIT 20
      ) valid_offsets
    ), '[]'::jsonb) AS reminder_day_offsets
  FROM legacy_rfi legacy
)
UPDATE app_workflow_action_definitions action
SET configuration = jsonb_build_object(
  'continuation', 'RESUME_SOURCE_TASK',
  'deadlineDays', normalized.deadline_days,
  'editableFieldPaths', normalized.editable_field_paths,
  'reminderDayOffsets', normalized.reminder_day_offsets,
  'expiryAction', CASE
    WHEN normalized.configuration->>'expiryAction' IN (
      'CLOSE_REQUEST',
      'ESCALATE',
      'RETURN'
    ) THEN normalized.configuration->>'expiryAction'
    ELSE 'ESCALATE'
  END,
  'participantScope', 'APPLICATION_OWNER_AND_REQUESTER',
  'recipientScope', 'APPLICATION_OWNER'
)
FROM normalized_rfi normalized
WHERE action.id = normalized.id;
--> statement-breakpoint
ALTER TABLE app_workflow_action_definitions
  ENABLE TRIGGER app_workflow_actions_immutable;
