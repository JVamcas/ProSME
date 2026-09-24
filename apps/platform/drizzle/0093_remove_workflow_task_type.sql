ALTER TABLE app_workflow_tasks
  DROP COLUMN IF EXISTS type_snapshot;

ALTER TABLE app_stage_task_definitions
  DROP COLUMN IF EXISTS type;
