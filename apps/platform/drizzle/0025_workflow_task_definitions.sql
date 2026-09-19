ALTER TABLE app_stage_task_definitions
  ADD COLUMN description text NOT NULL DEFAULT '',
  ADD COLUMN assignment_mode text NOT NULL DEFAULT 'ROLE',
  ADD COLUMN reviewer_count integer NOT NULL DEFAULT 1,
  ADD COLUMN required_completion_count integer NOT NULL DEFAULT 1,
  ADD COLUMN quorum boolean NOT NULL DEFAULT false,
  ADD COLUMN coi_required boolean NOT NULL DEFAULT false;
--> statement-breakpoint
UPDATE app_stage_task_definitions
SET assignment_mode = 'NAMED_USER',
    assignment_role_id = NULL
WHERE assignment_user_id IS NOT NULL;
--> statement-breakpoint
ALTER TABLE app_stage_task_definitions
  ADD CONSTRAINT app_stage_tasks_stable_key_check
    CHECK (code ~ '^[A-Z][A-Z0-9_]*$'),
  ADD CONSTRAINT app_stage_tasks_name_check
    CHECK (length(btrim(name)) BETWEEN 2 AND 160),
  ADD CONSTRAINT app_stage_tasks_description_check
    CHECK (length(description) <= 1000),
  ADD CONSTRAINT app_stage_tasks_assignment_mode_check
    CHECK (assignment_mode IN ('ROLE', 'NAMED_USER')),
  ADD CONSTRAINT app_stage_tasks_reviewer_count_check
    CHECK (reviewer_count BETWEEN 1 AND 100),
  ADD CONSTRAINT app_stage_tasks_completion_count_check
    CHECK (
      required_completion_count BETWEEN 1 AND reviewer_count
    ),
  ADD CONSTRAINT app_stage_tasks_assignment_target_check
    CHECK (
      (assignment_mode = 'ROLE' AND assignment_user_id IS NULL)
      OR (
        assignment_mode = 'NAMED_USER'
        AND assignment_role_id IS NULL
        AND assignment_user_id IS NOT NULL
        AND reviewer_count = 1
      )
    ),
  ADD CONSTRAINT app_stage_tasks_quorum_check
    CHECK (
      NOT quorum
      OR (
        reviewer_count >= 2
        AND required_completion_count * 2 > reviewer_count
      )
    );
