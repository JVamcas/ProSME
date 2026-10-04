-- Preserve configured ownership, including immutable published versions.
-- This changes persistence scope without changing their keys, criteria or answers.
ALTER TABLE app_workflow_stage_scoring_criteria
  ADD COLUMN task_definition_id uuid;
--> statement-breakpoint
UPDATE app_workflow_stage_scoring_criteria criterion
SET task_definition_id = scoring.task_definition_id
FROM app_workflow_stage_scoring_configurations scoring
WHERE scoring.stage_id = criterion.stage_id;
--> statement-breakpoint
ALTER TABLE app_workflow_stage_scoring_criteria
  ALTER COLUMN task_definition_id SET NOT NULL,
  DROP CONSTRAINT app_stage_scoring_criterion_configuration_fk;
--> statement-breakpoint
ALTER TABLE app_workflow_stage_scoring_configurations
  DROP CONSTRAINT app_workflow_stage_scoring_configurations_pkey,
  ADD PRIMARY KEY (task_definition_id);
--> statement-breakpoint
CREATE UNIQUE INDEX app_stage_scoring_configuration_stage_task_unique
  ON app_workflow_stage_scoring_configurations (stage_id, task_definition_id);
--> statement-breakpoint
ALTER TABLE app_workflow_stage_scoring_criteria
  ADD CONSTRAINT app_stage_scoring_criterion_configuration_fk
  FOREIGN KEY (stage_id, task_definition_id)
  REFERENCES app_workflow_stage_scoring_configurations (stage_id, task_definition_id)
  ON DELETE RESTRICT;
--> statement-breakpoint
DROP INDEX app_stage_checklists_stage_key_unique;
CREATE UNIQUE INDEX app_stage_checklists_stage_key_unique
  ON app_workflow_stage_checklist_definitions (task_definition_id, key);
--> statement-breakpoint
DROP INDEX app_stage_checklists_stage_order_unique;
CREATE UNIQUE INDEX app_stage_checklists_stage_order_unique
  ON app_workflow_stage_checklist_definitions (task_definition_id, display_order);
--> statement-breakpoint
DROP INDEX app_stage_comments_stage_key_unique;
CREATE UNIQUE INDEX app_stage_comments_stage_key_unique
  ON app_workflow_stage_comment_fields (task_definition_id, key);
--> statement-breakpoint
DROP INDEX app_stage_comments_stage_order_unique;
CREATE UNIQUE INDEX app_stage_comments_stage_order_unique
  ON app_workflow_stage_comment_fields (task_definition_id, display_order);
--> statement-breakpoint
ALTER TABLE app_workflow_stage_document_requirements
  DROP CONSTRAINT app_stage_documents_stage_key_unique;
CREATE UNIQUE INDEX app_stage_documents_stage_key_unique
  ON app_workflow_stage_document_requirements (task_definition_id, stable_key);
--> statement-breakpoint
DROP INDEX app_stage_documents_stage_name_unique;
CREATE UNIQUE INDEX app_stage_documents_stage_name_unique
  ON app_workflow_stage_document_requirements (task_definition_id, name);
--> statement-breakpoint
ALTER TABLE app_workflow_stage_scoring_criteria
  DROP CONSTRAINT app_stage_scoring_criteria_key_unique;
CREATE UNIQUE INDEX app_stage_scoring_criteria_key_unique
  ON app_workflow_stage_scoring_criteria (task_definition_id, stable_key);
--> statement-breakpoint
DROP INDEX app_stage_scoring_criteria_name_unique;
CREATE UNIQUE INDEX app_stage_scoring_criteria_name_unique
  ON app_workflow_stage_scoring_criteria (task_definition_id, criterion);
--> statement-breakpoint
-- Shared evidence includes uploads from completed or replaced reviewer slots.
CREATE INDEX app_workflow_tasks_scope_idx
  ON app_workflow_tasks (stage_instance_id, workflow_task_definition_id);
