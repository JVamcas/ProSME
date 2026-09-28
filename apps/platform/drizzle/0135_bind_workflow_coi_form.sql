ALTER TABLE app_workflow_definition_versions
  ADD COLUMN coi_form_version_id uuid;
--> statement-breakpoint
ALTER TABLE app_workflow_definition_versions
  DISABLE TRIGGER app_workflow_versions_lifecycle;
--> statement-breakpoint
UPDATE app_workflow_definition_versions version
SET coi_form_version_id = selected.id
FROM LATERAL (
  SELECT form_version.id
  FROM app_form_versions form_version
  JOIN app_form_definitions definition
    ON definition.id = form_version.form_definition_id
  WHERE definition.code = 'COI_DECLARATION'
    AND definition.purpose = 'COI'
    AND form_version.status = 'PUBLISHED'
  ORDER BY form_version.version_number DESC
  LIMIT 1
) selected
WHERE EXISTS (
  SELECT 1
  FROM app_workflow_stage_definitions stage
  LEFT JOIN app_stage_task_definitions task ON task.stage_id = stage.id
  WHERE stage.version_id = version.id
    AND (stage.coi_gated OR task.coi_required)
);
--> statement-breakpoint
ALTER TABLE app_workflow_definition_versions
  ENABLE TRIGGER app_workflow_versions_lifecycle;
--> statement-breakpoint
ALTER TABLE app_workflow_definition_versions
  ADD CONSTRAINT app_workflow_versions_coi_form_version_fk
  FOREIGN KEY (coi_form_version_id)
  REFERENCES app_form_versions(id)
  ON DELETE restrict;
--> statement-breakpoint
CREATE INDEX app_workflow_versions_coi_form_version_idx
  ON app_workflow_definition_versions(coi_form_version_id);
--> statement-breakpoint
ALTER TABLE app_workflow_application_coi_events
  ADD COLUMN form_version_id uuid;
--> statement-breakpoint
UPDATE app_workflow_application_coi_events event
SET form_version_id = version.coi_form_version_id
FROM app_workflow_tasks task
JOIN app_workflow_stage_instances stage ON stage.id = task.stage_instance_id
JOIN app_workflow_instances workflow ON workflow.id = stage.workflow_instance_id
JOIN app_workflow_definition_versions version
  ON version.id = workflow.workflow_template_version_id
WHERE event.task_id = task.id
  AND version.coi_form_version_id IS NOT NULL;
--> statement-breakpoint
ALTER TABLE app_workflow_application_coi_events
  ADD CONSTRAINT app_workflow_coi_events_form_version_fk
  FOREIGN KEY (form_version_id)
  REFERENCES app_form_versions(id)
  ON DELETE restrict;
