ALTER TABLE app_workflow_application_coi_events
  ADD COLUMN form_values jsonb,
  ADD COLUMN form_definition_snapshot jsonb;
--> statement-breakpoint
ALTER TABLE app_workflow_application_coi_events
  ADD CONSTRAINT app_workflow_coi_event_form_answers_check
  CHECK (
    (form_values IS NULL AND form_definition_snapshot IS NULL)
    OR (
      form_values IS NOT NULL AND form_definition_snapshot IS NOT NULL
      AND jsonb_typeof(form_values) = 'object'
      AND jsonb_typeof(form_definition_snapshot) = 'object'
      AND form_definition_snapshot ->> 'versionId' IS NOT NULL
      AND form_definition_snapshot ->> 'versionId' = form_version_id::text
    )
  );
