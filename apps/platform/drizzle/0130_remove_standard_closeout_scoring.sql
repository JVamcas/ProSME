-- Evaluation close-out is a checklist and form review, not a scoring task.
-- Apply the correction to every persisted standard workflow version so active
-- task instances stop inheriting the obsolete scoring requirement.
DELETE FROM app_workflow_stage_scoring_criteria AS criterion
USING app_workflow_stage_definitions AS stage,
  app_workflow_definition_versions AS version,
  app_workflow_definitions AS workflow
WHERE criterion.stage_id = stage.id
  AND stage.version_id = version.id
  AND version.definition_id = workflow.id
  AND workflow.code = 'SME_FUND_STANDARD'
  AND stage.code = 'EVALUATION_CLOSE_OUT';
--> statement-breakpoint
DELETE FROM app_workflow_stage_scoring_configurations AS scoring
USING app_workflow_stage_definitions AS stage,
  app_workflow_definition_versions AS version,
  app_workflow_definitions AS workflow
WHERE scoring.stage_id = stage.id
  AND stage.version_id = version.id
  AND version.definition_id = workflow.id
  AND workflow.code = 'SME_FUND_STANDARD'
  AND stage.code = 'EVALUATION_CLOSE_OUT';
