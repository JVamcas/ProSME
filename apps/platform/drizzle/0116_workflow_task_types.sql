ALTER TABLE app_stage_task_definitions
  ADD COLUMN task_type text NOT NULL DEFAULT 'CONTRIBUTING'
  CHECK (task_type IN ('CONTRIBUTING', 'STAGE_DECISION'));
--> statement-breakpoint
ALTER TABLE app_stage_task_definitions
  DISABLE TRIGGER app_stage_tasks_immutable;
--> statement-breakpoint
WITH decision_candidates AS (
  SELECT task.id,
    ROW_NUMBER() OVER (
      PARTITION BY task.stage_id
      ORDER BY task.sequence, task.id
    ) AS candidate_order
  FROM app_stage_task_definitions task
  WHERE task.reviewer_count = 1
    AND EXISTS (
      SELECT 1
      FROM app_stage_task_action_bindings binding
      JOIN app_workflow_action_definitions action
        ON action.stage_id = binding.stage_id
        AND action.stable_key = binding.action_key
      WHERE binding.task_definition_id = task.id
        AND action.action_type IN (
          'APPROVE_ADVANCE',
          'REJECT',
          'RETURN',
          'WITHDRAW',
          'DEFER'
        )
    )
)
UPDATE app_stage_task_definitions task
SET task_type = 'STAGE_DECISION'
FROM decision_candidates candidate
WHERE candidate.id = task.id
  AND candidate.candidate_order = 1;
--> statement-breakpoint
ALTER TABLE app_stage_task_definitions
  ENABLE TRIGGER app_stage_tasks_immutable;
--> statement-breakpoint
ALTER TABLE app_stage_task_definitions
  ADD CONSTRAINT app_stage_tasks_decision_single_reviewer_check
  CHECK (task_type <> 'STAGE_DECISION' OR reviewer_count = 1);
--> statement-breakpoint
CREATE UNIQUE INDEX app_stage_tasks_one_decision_per_stage_unique
  ON app_stage_task_definitions (stage_id)
  WHERE task_type = 'STAGE_DECISION';
