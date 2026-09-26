-- Finance review is an application review form. Earlier purpose backfill missed it.
UPDATE app_form_definitions
SET purpose = 'APPLICATION_REVIEW',
    updated_at = now()
WHERE code = 'FINANCE_REVIEW'
  AND purpose = 'OTHER';
--> statement-breakpoint
-- Remove the standard draft's technical binding only when it points to an
-- unpublished form. The form version remains intact and can be published later.
DELETE FROM app_stage_task_form_bindings AS binding
USING app_stage_task_definitions AS task,
  app_workflow_stage_definitions AS stage,
  app_workflow_definition_versions AS version,
  app_workflow_definitions AS workflow,
  app_form_versions AS form_version
WHERE binding.task_definition_id = task.id
  AND task.stage_id = stage.id
  AND stage.version_id = version.id
  AND version.definition_id = workflow.id
  AND binding.form_version_id = form_version.id
  AND workflow.code = 'SME_FUND_STANDARD'
  AND version.status = 'DRAFT'
  AND task.code = 'TECHNICAL_REVIEW'
  AND task.config ->> 'formPurpose' = 'APPLICATION_REVIEW'
  AND form_version.status <> 'PUBLISHED';
