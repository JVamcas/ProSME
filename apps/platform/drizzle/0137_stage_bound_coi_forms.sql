ALTER TABLE app_workflow_stage_definitions
  ADD COLUMN coi_form_version_id uuid;
--> statement-breakpoint
ALTER TABLE app_workflow_stage_definitions
  DISABLE TRIGGER app_workflow_stages_immutable;
--> statement-breakpoint
UPDATE app_workflow_stage_definitions stage
SET coi_gated = true,
    coi_form_version_id = version.coi_form_version_id
FROM app_workflow_definition_versions version
WHERE version.id = stage.version_id
  AND (
    stage.coi_gated
    OR EXISTS (
      SELECT 1
      FROM app_stage_task_definitions task
      WHERE task.stage_id = stage.id
        AND task.coi_required
    )
  );
--> statement-breakpoint
ALTER TABLE app_workflow_stage_definitions
  ENABLE TRIGGER app_workflow_stages_immutable;
--> statement-breakpoint
ALTER TABLE app_workflow_stage_definitions
  ADD CONSTRAINT app_workflow_stages_coi_form_version_fk
    FOREIGN KEY (coi_form_version_id)
    REFERENCES app_form_versions(id)
    ON DELETE restrict,
  ADD CONSTRAINT app_workflow_stages_coi_binding_check
    CHECK (
      (coi_gated AND coi_form_version_id IS NOT NULL)
      OR (NOT coi_gated AND coi_form_version_id IS NULL)
    );
--> statement-breakpoint
CREATE INDEX app_workflow_stages_coi_form_version_idx
  ON app_workflow_stage_definitions(coi_form_version_id);
--> statement-breakpoint
ALTER TABLE app_workflow_application_coi
  ADD COLUMN form_version_id uuid;
--> statement-breakpoint
UPDATE app_workflow_application_coi clearance
SET form_version_id = stage_definition.coi_form_version_id
FROM app_workflow_tasks task
JOIN app_workflow_stage_instances stage
  ON stage.id = task.stage_instance_id
JOIN app_workflow_stage_definitions stage_definition
  ON stage_definition.id = stage.workflow_stage_definition_id
WHERE task.id = clearance.task_id;
--> statement-breakpoint
ALTER TABLE app_workflow_application_coi
  ALTER COLUMN form_version_id SET NOT NULL,
  ADD CONSTRAINT app_workflow_application_coi_form_version_fk
    FOREIGN KEY (form_version_id)
    REFERENCES app_form_versions(id)
    ON DELETE restrict,
  DROP CONSTRAINT app_workflow_application_coi_pkey,
  ADD CONSTRAINT app_workflow_application_coi_pkey
    PRIMARY KEY (application_id, user_id, form_version_id);
--> statement-breakpoint
ALTER TABLE app_workflow_application_coi_events
  ALTER COLUMN form_version_id SET NOT NULL;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_workflow_task_coi_cleared(
  p_task_id uuid,
  p_user_id uuid
)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT COALESCE((
    SELECT CASE
      WHEN EXISTS (
        SELECT 1 FROM app_workflow_tasks successor
        WHERE successor.supersedes_task_id = task.id
      ) THEN false
      WHEN NOT stage_definition.coi_gated THEN true
      ELSE EXISTS (
        SELECT 1 FROM app_workflow_application_coi clearance
        WHERE clearance.application_id = workflow.application_id
          AND clearance.user_id = p_user_id
          AND clearance.form_version_id = stage_definition.coi_form_version_id
          AND clearance.state IN (
            'CLEARED_NO_CONFLICT',
            'CLEARED_AFTER_REVIEW'
          )
      )
    END
    FROM app_workflow_tasks task
    JOIN app_workflow_stage_instances stage
      ON stage.id = task.stage_instance_id
    JOIN app_workflow_stage_definitions stage_definition
      ON stage_definition.id = stage.workflow_stage_definition_id
    JOIN app_workflow_instances workflow
      ON workflow.id = stage.workflow_instance_id
    WHERE task.id = p_task_id
  ), false);
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_workflow_stage_coi_cleared(
  p_stage_id uuid,
  p_user_id uuid
)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT COALESCE((
    SELECT CASE
      WHEN NOT stage_definition.coi_gated THEN true
      ELSE EXISTS (
        SELECT 1 FROM app_workflow_tasks task
        WHERE task.stage_instance_id = stage.id
          AND task.status <> 'CANCELLED'
          AND NOT EXISTS (
            SELECT 1 FROM app_workflow_tasks successor
            WHERE successor.supersedes_task_id = task.id
          )
      ) AND NOT EXISTS (
        SELECT 1 FROM app_workflow_tasks task
        WHERE task.stage_instance_id = stage.id
          AND task.status <> 'CANCELLED'
          AND NOT EXISTS (
            SELECT 1 FROM app_workflow_tasks successor
            WHERE successor.supersedes_task_id = task.id
          )
          AND NOT app_workflow_task_coi_cleared(task.id, p_user_id)
      )
    END
    FROM app_workflow_stage_instances stage
    JOIN app_workflow_stage_definitions stage_definition
      ON stage_definition.id = stage.workflow_stage_definition_id
    WHERE stage.id = p_stage_id
  ), false);
$$;
--> statement-breakpoint
ALTER TABLE app_stage_task_definitions
  DROP COLUMN coi_required;
--> statement-breakpoint
DROP INDEX app_workflow_versions_coi_form_version_idx;
ALTER TABLE app_workflow_definition_versions
  DROP CONSTRAINT app_workflow_versions_coi_form_version_fk,
  DROP COLUMN coi_form_version_id;
