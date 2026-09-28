ALTER TABLE app_workflow_stage_document_requirements
  ADD COLUMN stable_key text;

WITH normalized AS (
  SELECT id, stage_id,
    CASE
      WHEN key_value = '' THEN 'DOCUMENT'
      WHEN key_value ~ '^[A-Z]' THEN key_value
      ELSE 'DOCUMENT_' || key_value
    END AS base_key
  FROM (
    SELECT id, stage_id,
      trim(BOTH '_' FROM upper(regexp_replace(trim(name), '[^A-Za-z0-9]+', '_', 'g'))) AS key_value
    FROM app_workflow_stage_document_requirements
  ) source
), ranked AS (
  SELECT id, base_key,
    row_number() OVER (PARTITION BY stage_id, base_key ORDER BY id) AS position,
    count(*) OVER (PARTITION BY stage_id, base_key) AS duplicate_count
  FROM normalized
)
UPDATE app_workflow_stage_document_requirements requirement
SET stable_key = CASE
  WHEN ranked.duplicate_count = 1 THEN left(ranked.base_key, 80)
  ELSE left(ranked.base_key, 75) || '_' || ranked.position
END
FROM ranked
WHERE ranked.id = requirement.id;

ALTER TABLE app_workflow_stage_scoring_criteria
  ADD COLUMN stable_key text;

WITH normalized AS (
  SELECT id, stage_id,
    CASE
      WHEN key_value = '' THEN 'SCORE'
      WHEN key_value ~ '^[A-Z]' THEN key_value
      ELSE 'SCORE_' || key_value
    END AS base_key
  FROM (
    SELECT id, stage_id,
      trim(BOTH '_' FROM upper(regexp_replace(trim(criterion), '[^A-Za-z0-9]+', '_', 'g'))) AS key_value
    FROM app_workflow_stage_scoring_criteria
  ) source
), ranked AS (
  SELECT id, base_key,
    row_number() OVER (PARTITION BY stage_id, base_key ORDER BY id) AS position,
    count(*) OVER (PARTITION BY stage_id, base_key) AS duplicate_count
  FROM normalized
)
UPDATE app_workflow_stage_scoring_criteria criterion
SET stable_key = CASE
  WHEN ranked.duplicate_count = 1 THEN left(ranked.base_key, 80)
  ELSE left(ranked.base_key, 75) || '_' || ranked.position
END
FROM ranked
WHERE ranked.id = criterion.id;

UPDATE app_workflow_tasks task
SET result = jsonb_set(
  task.result,
  '{documents}',
  (
    SELECT jsonb_agg(
      item.value || jsonb_build_object(
        'category', COALESCE(requirement.stable_key, item.value->>'category')
      )
      ORDER BY item.ordinality
    )
    FROM jsonb_array_elements(task.result->'documents')
      WITH ORDINALITY AS item(value, ordinality)
    LEFT JOIN app_workflow_stage_document_requirements requirement
      ON requirement.task_definition_id = task.workflow_task_definition_id
      AND requirement.name = item.value->>'category'
  ),
  true
)
WHERE jsonb_typeof(task.result->'documents') = 'array';

UPDATE app_workflow_tasks task
SET result = jsonb_set(
  task.result,
  '{scores}',
  (
    SELECT jsonb_agg(
      item.value || jsonb_build_object(
        'criterion', COALESCE(criterion.stable_key, item.value->>'criterion')
      )
      ORDER BY item.ordinality
    )
    FROM jsonb_array_elements(task.result->'scores')
      WITH ORDINALITY AS item(value, ordinality)
    LEFT JOIN app_workflow_stage_scoring_configurations scoring
      ON scoring.task_definition_id = task.workflow_task_definition_id
    LEFT JOIN app_workflow_stage_scoring_criteria criterion
      ON criterion.stage_id = scoring.stage_id
      AND criterion.criterion = item.value->>'criterion'
  ),
  true
)
WHERE jsonb_typeof(task.result->'scores') = 'array';

ALTER TABLE app_workflow_stage_document_requirements
  ALTER COLUMN stable_key SET NOT NULL,
  ADD CONSTRAINT app_stage_documents_stable_key_check
    CHECK (stable_key ~ '^[A-Z][A-Z0-9_]{1,79}$'),
  ADD CONSTRAINT app_stage_documents_stage_key_unique
    UNIQUE (stage_id, stable_key);

ALTER TABLE app_workflow_stage_scoring_criteria
  ALTER COLUMN stable_key SET NOT NULL,
  ADD CONSTRAINT app_stage_scoring_criteria_stable_key_check
    CHECK (stable_key ~ '^[A-Z][A-Z0-9_]{1,79}$'),
  ADD CONSTRAINT app_stage_scoring_criteria_key_unique
    UNIQUE (stage_id, stable_key);

ALTER TABLE app_workflow_definitions
  ADD CONSTRAINT app_workflow_definitions_code_nonempty_check
    CHECK (code <> '');
ALTER TABLE app_workflow_stage_definitions
  ADD CONSTRAINT app_workflow_stages_code_nonempty_check
    CHECK (code <> '');
ALTER TABLE app_stage_task_definitions
  ADD CONSTRAINT app_stage_tasks_code_nonempty_check
    CHECK (code <> '');
ALTER TABLE app_workflow_action_definitions
  ADD CONSTRAINT app_workflow_actions_stable_key_nonempty_check
    CHECK (stable_key <> '');
ALTER TABLE app_workflow_stage_checklist_definitions
  ADD CONSTRAINT app_stage_checklists_key_nonempty_check
    CHECK (key <> '');
ALTER TABLE app_workflow_stage_comment_fields
  ADD CONSTRAINT app_stage_comments_key_nonempty_check
    CHECK (key <> '');
