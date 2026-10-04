-- Published and retired workflow versions are immutable. Their Refer actions
-- remain historical records and are rejected by runtime policy. Disable Refer
-- only in editable drafts so those drafts can be cleaned up before publishing.
UPDATE app_workflow_action_definitions action
SET enabled = FALSE
FROM app_workflow_stage_definitions stage
JOIN app_workflow_definition_versions version ON version.id = stage.version_id
WHERE action.stage_id = stage.id
  AND action.action_type = 'REFER'
  AND action.enabled = TRUE
  AND version.status = 'DRAFT';
