ALTER TABLE app_stage_task_definitions
  DISABLE TRIGGER app_stage_tasks_immutable;

UPDATE app_stage_task_definitions
SET quorum = false,
    quorum_rule = NULL
WHERE quorum = true
   OR quorum_rule IS NOT NULL;

ALTER TABLE app_stage_task_definitions
  ENABLE TRIGGER app_stage_tasks_immutable;
