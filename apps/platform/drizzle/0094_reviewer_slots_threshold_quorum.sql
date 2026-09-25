ALTER TABLE app_stage_task_definitions
  ADD COLUMN review_release text NOT NULL DEFAULT 'STAGE_COMPLETED'
    CHECK (review_release IN ('STAGE_COMPLETED', 'THRESHOLD_MET', 'IMMEDIATE'));
--> statement-breakpoint
ALTER TABLE app_stage_task_definitions
  ADD COLUMN completion_mode text NOT NULL DEFAULT 'COUNT'
    CHECK (completion_mode IN ('ALL', 'COUNT', 'PERCENT'));
--> statement-breakpoint
ALTER TABLE app_stage_task_definitions
  ADD COLUMN completion_percentage integer
    CHECK (completion_percentage BETWEEN 1 AND 100);
--> statement-breakpoint

ALTER TABLE app_stage_task_definitions
  ADD COLUMN quorum_rule jsonb;
--> statement-breakpoint

ALTER TABLE app_workflow_tasks
  ADD COLUMN reviewer_slot integer NOT NULL DEFAULT 1;
--> statement-breakpoint
ALTER TABLE app_workflow_tasks
  ADD COLUMN supersedes_task_id uuid
    REFERENCES app_workflow_tasks(id) ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE app_workflow_tasks
  ADD CONSTRAINT app_workflow_tasks_reviewer_slot_positive CHECK (reviewer_slot > 0);
--> statement-breakpoint
DROP INDEX app_workflow_tasks_definition_unique;
--> statement-breakpoint
CREATE UNIQUE INDEX app_workflow_tasks_slot_unique
  ON app_workflow_tasks (stage_instance_id, workflow_task_definition_id, reviewer_slot)
  WHERE status <> 'CANCELLED';
--> statement-breakpoint
CREATE UNIQUE INDEX app_workflow_tasks_distinct_reviewer_unique
  ON app_workflow_tasks (stage_instance_id, workflow_task_definition_id, assigned_user_id)
  WHERE assigned_user_id IS NOT NULL AND status <> 'CANCELLED';
--> statement-breakpoint

CREATE TABLE app_workflow_review_threshold_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_instance_id uuid NOT NULL REFERENCES app_workflow_stage_instances(id) ON DELETE RESTRICT,
  task_definition_id uuid NOT NULL REFERENCES app_stage_task_definitions(id) ON DELETE RESTRICT,
  rule jsonb NOT NULL,
  denominator integer NOT NULL,
  required_count integer NOT NULL,
  completed_task_ids uuid[] NOT NULL,
  satisfied boolean NOT NULL,
  first_satisfied boolean NOT NULL DEFAULT false,
  trigger_task_id uuid REFERENCES app_workflow_tasks(id) ON DELETE RESTRICT,
  evaluated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX app_workflow_review_threshold_stage_idx
  ON app_workflow_review_threshold_evaluations (stage_instance_id, task_definition_id, evaluated_at DESC);
--> statement-breakpoint
CREATE UNIQUE INDEX app_workflow_review_threshold_first_unique
  ON app_workflow_review_threshold_evaluations (stage_instance_id, task_definition_id)
  WHERE first_satisfied = true;
--> statement-breakpoint

CREATE TABLE app_workflow_quorum_participants (
  stage_instance_id uuid NOT NULL REFERENCES app_workflow_stage_instances(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  responsibility text NOT NULL,
  is_chair boolean NOT NULL DEFAULT false,
  attendance text NOT NULL CHECK (attendance IN ('PRESENT', 'ABSENT', 'RECUSED')),
  coi_cleared boolean NOT NULL DEFAULT false,
  abstained boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  PRIMARY KEY (stage_instance_id, user_id)
);
--> statement-breakpoint
CREATE TABLE app_workflow_quorum_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_instance_id uuid NOT NULL REFERENCES app_workflow_stage_instances(id) ON DELETE RESTRICT,
  task_definition_id uuid NOT NULL REFERENCES app_stage_task_definitions(id) ON DELETE RESTRICT,
  rule jsonb NOT NULL,
  eligible_denominator integer NOT NULL,
  present_user_ids uuid[] NOT NULL,
  cleared_user_ids uuid[] NOT NULL,
  recused_user_ids uuid[] NOT NULL,
  absent_user_ids uuid[] NOT NULL,
  satisfied boolean NOT NULL,
  trigger_actor_id uuid REFERENCES app_users(id) ON DELETE RESTRICT,
  evaluated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX app_workflow_quorum_stage_idx
  ON app_workflow_quorum_evaluations (stage_instance_id, task_definition_id, evaluated_at DESC);
--> statement-breakpoint

INSERT INTO app_capabilities (code, description)
VALUES ('workflow.quorum.all.record',
  'Record quorum participation for any active workflow stage')
ON CONFLICT (code) DO NOTHING;
--> statement-breakpoint
