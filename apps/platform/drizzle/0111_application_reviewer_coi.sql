DROP FUNCTION app_workflow_stage_coi_cleared(uuid, uuid);
DROP FUNCTION app_workflow_task_coi_cleared(uuid, uuid);
--> statement-breakpoint
CREATE TABLE app_workflow_application_coi (
  application_id uuid NOT NULL REFERENCES app_applications(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  task_id uuid NOT NULL REFERENCES app_workflow_tasks(id) ON DELETE RESTRICT,
  state text NOT NULL CHECK (state IN (
    'CLEARED_NO_CONFLICT', 'PENDING_REVIEW', 'CLEARED_AFTER_REVIEW',
    'RECUSED', 'REVOKED'
  )),
  row_version integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (application_id, user_id)
);
--> statement-breakpoint
CREATE TABLE app_workflow_application_coi_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES app_applications(id) ON DELETE RESTRICT,
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
CREATE INDEX app_workflow_application_coi_events_subject_idx
  ON app_workflow_application_coi_events (
    application_id, subject_user_id, occurred_at
  );
CREATE INDEX app_workflow_application_coi_events_task_idx
  ON app_workflow_application_coi_events (task_id, occurred_at);
--> statement-breakpoint
WITH ranked_clearance AS (
  SELECT workflow.application_id, clearance.user_id, clearance.task_id,
    clearance.state, clearance.row_version, clearance.updated_at,
    row_number() OVER (
      PARTITION BY workflow.application_id, clearance.user_id
      ORDER BY CASE clearance.state
        WHEN 'REVOKED' THEN 5
        WHEN 'RECUSED' THEN 4
        WHEN 'PENDING_REVIEW' THEN 3
        WHEN 'CLEARED_AFTER_REVIEW' THEN 2
        ELSE 1
      END DESC, clearance.updated_at DESC, clearance.task_id
    ) AS priority
  FROM app_workflow_task_coi clearance
  JOIN app_workflow_tasks task ON task.id = clearance.task_id
  JOIN app_workflow_stage_instances stage ON stage.id = task.stage_instance_id
  JOIN app_workflow_instances workflow ON workflow.id = stage.workflow_instance_id
)
INSERT INTO app_workflow_application_coi (
  application_id, user_id, task_id, state, row_version, updated_at
)
SELECT application_id, user_id, task_id, state, row_version, updated_at
FROM ranked_clearance
WHERE priority = 1;
--> statement-breakpoint
INSERT INTO app_workflow_application_coi_events (
  id, application_id, task_id, subject_user_id, actor_id, from_state,
  to_state, disclosure_text, reason, occurred_at
)
SELECT event.id, workflow.application_id, event.task_id,
  event.subject_user_id, event.actor_id, event.from_state, event.to_state,
  event.disclosure_text, event.reason, event.occurred_at
FROM app_workflow_task_coi_events event
JOIN app_workflow_tasks task ON task.id = event.task_id
JOIN app_workflow_stage_instances stage ON stage.id = task.stage_instance_id
JOIN app_workflow_instances workflow ON workflow.id = stage.workflow_instance_id;
--> statement-breakpoint
DROP TABLE app_workflow_task_coi_events;
DROP TABLE app_workflow_task_coi;
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
        SELECT 1 FROM app_workflow_application_coi clearance
        WHERE clearance.application_id = workflow.application_id
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
    JOIN app_workflow_instances workflow ON workflow.id = stage.workflow_instance_id
    WHERE task.id = p_task_id
  ), false);
$$;
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
