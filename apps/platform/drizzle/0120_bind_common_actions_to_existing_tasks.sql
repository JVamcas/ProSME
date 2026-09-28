INSERT INTO app_stage_task_action_bindings (
  task_definition_id,
  stage_id,
  action_key
)
SELECT task.id,
  action.stage_id,
  action.stable_key
FROM app_workflow_action_definitions action
JOIN app_stage_task_definitions task
  ON task.stage_id = action.stage_id
WHERE action.action_type IN (
  'REQUEST_INFORMATION',
  'REFER',
  'ESCALATE',
  'PUT_ON_HOLD'
)
ON CONFLICT (task_definition_id, action_key) DO NOTHING;
