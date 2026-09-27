ALTER TABLE app_workflow_action_definitions
  DISABLE TRIGGER app_workflow_actions_immutable;

UPDATE app_workflow_action_definitions
SET reason_code_required = false
WHERE action_type = 'REJECT'
  AND reason_code_required = true;

ALTER TABLE app_workflow_action_definitions
  ENABLE TRIGGER app_workflow_actions_immutable;
