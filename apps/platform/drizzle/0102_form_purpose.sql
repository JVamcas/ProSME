ALTER TABLE "app_form_definitions"
  ADD COLUMN "purpose" text NOT NULL DEFAULT 'OTHER';
--> statement-breakpoint
UPDATE "app_form_definitions"
SET "purpose" = 'FUNDING_APPLICATION'
WHERE "code" = 'FUNDING_APPLICATION'
  OR "id" IN (
    SELECT version.form_definition_id
    FROM app_form_versions version
    JOIN app_funding_calls call ON call.form_version_id = version.id
  );
--> statement-breakpoint
UPDATE "app_form_definitions"
SET "purpose" = 'APPLICATION_REVIEW'
WHERE "code" IN (
  'ELIGIBILITY_VERIFICATION', 'TECHNICAL_REVIEW', 'DUE_DILIGENCE_RISK',
  'MODERATION', 'COMMITTEE_REVIEW', 'APPROVAL', 'APPEAL_REVIEW',
  'DISBURSEMENT_REVIEW', 'MONITORING_REVIEW', 'EVALUATION_CLOSE_OUT_REVIEW'
);
--> statement-breakpoint
-- Existing published workflow versions also need their bound form purpose.
-- The migration transaction restores the guard before it commits.
ALTER TABLE app_stage_task_definitions
  DISABLE TRIGGER app_stage_tasks_immutable;
--> statement-breakpoint
UPDATE app_stage_task_definitions task
SET config = jsonb_set(
  COALESCE(task.config, '{}'::jsonb),
  '{formPurpose}',
  to_jsonb(definition.purpose),
  true
)
FROM app_stage_task_form_bindings binding
JOIN app_form_versions version ON version.id = binding.form_version_id
JOIN app_form_definitions definition ON definition.id = version.form_definition_id
WHERE binding.task_definition_id = task.id;
--> statement-breakpoint
ALTER TABLE app_stage_task_definitions
  ENABLE TRIGGER app_stage_tasks_immutable;
--> statement-breakpoint
ALTER TABLE "app_form_definitions"
  ADD CONSTRAINT "app_form_definitions_purpose_check"
  CHECK ("purpose" IN (
    'FUNDING_APPLICATION', 'APPLICATION_REVIEW', 'COI', 'RFI', 'OTHER'
  ));
