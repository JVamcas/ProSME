CREATE TABLE app_workflow_task_coi (
  task_id uuid PRIMARY KEY REFERENCES app_workflow_tasks(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  state text NOT NULL CHECK (state IN (
    'CLEARED_NO_CONFLICT', 'PENDING_REVIEW', 'CLEARED_AFTER_REVIEW',
    'RECUSED', 'REVOKED'
  )),
  row_version integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE app_workflow_task_coi_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES app_workflow_tasks(id) ON DELETE RESTRICT,
  subject_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  actor_id uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  from_state text,
  to_state text NOT NULL,
  disclosure_text text,
  reason text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX app_workflow_task_coi_events_task_idx
  ON app_workflow_task_coi_events (task_id, occurred_at);
--> statement-breakpoint
CREATE FUNCTION app_workflow_task_coi_cleared(p_task_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT COALESCE((
    SELECT CASE
      WHEN EXISTS (
        SELECT 1 FROM app_workflow_tasks successor
        WHERE successor.supersedes_task_id = task.id
      ) THEN false
      WHEN NOT (definition.coi_required OR stage_definition.coi_gated)
        THEN true
      ELSE EXISTS (
        SELECT 1 FROM app_workflow_task_coi clearance
        WHERE clearance.task_id = task.id
          AND clearance.user_id = p_user_id
          AND clearance.state IN ('CLEARED_NO_CONFLICT', 'CLEARED_AFTER_REVIEW')
      )
    END
    FROM app_workflow_tasks task
    JOIN app_stage_task_definitions definition
      ON definition.id = task.workflow_task_definition_id
    JOIN app_workflow_stage_instances stage ON stage.id = task.stage_instance_id
    JOIN app_workflow_stage_definitions stage_definition
      ON stage_definition.id = stage.workflow_stage_definition_id
    WHERE task.id = p_task_id
  ), false);
$$;
--> statement-breakpoint
INSERT INTO app_capabilities (code, description)
VALUES ('workflow.coi.all.review', 'Independently review disclosed conflicts on assigned workflow tasks')
ON CONFLICT (code) DO NOTHING;
--> statement-breakpoint
CREATE FUNCTION app_workflow_stage_coi_cleared(p_stage_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT COALESCE((
    SELECT CASE
      WHEN NOT stage_definition.coi_gated
        AND NOT EXISTS (
          SELECT 1 FROM app_workflow_tasks task
          JOIN app_stage_task_definitions definition
            ON definition.id = task.workflow_task_definition_id
          WHERE task.stage_instance_id = stage.id
            AND task.assigned_user_id = p_user_id
            AND task.status <> 'CANCELLED'
            AND NOT EXISTS (
              SELECT 1 FROM app_workflow_tasks successor
              WHERE successor.supersedes_task_id = task.id
            )
            AND definition.coi_required
        ) THEN true
      ELSE EXISTS (
        SELECT 1 FROM app_workflow_tasks task
        WHERE task.stage_instance_id = stage.id
          AND task.assigned_user_id = p_user_id
          AND task.status <> 'CANCELLED'
          AND NOT EXISTS (
            SELECT 1 FROM app_workflow_tasks successor
            WHERE successor.supersedes_task_id = task.id
          )
      ) AND NOT EXISTS (
        SELECT 1 FROM app_workflow_tasks task
        WHERE task.stage_instance_id = stage.id
          AND task.assigned_user_id = p_user_id
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
  ADD COLUMN submitted_replacement_policy text NOT NULL DEFAULT 'DENY'
  CHECK (submitted_replacement_policy IN ('DENY', 'REOPEN_SLOT'));
--> statement-breakpoint
DROP INDEX app_workflow_tasks_slot_unique;
--> statement-breakpoint
CREATE UNIQUE INDEX app_workflow_tasks_slot_unique
  ON app_workflow_tasks (stage_instance_id, workflow_task_definition_id, reviewer_slot)
  WHERE status NOT IN ('CANCELLED', 'COMPLETED');
