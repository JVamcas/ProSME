ALTER TABLE app_form_fields ADD COLUMN scoring_aggregate jsonb;
--> statement-breakpoint
ALTER TABLE app_form_fields DROP CONSTRAINT app_form_fields_type_check;
ALTER TABLE app_form_fields ADD CONSTRAINT app_form_fields_type_check CHECK (type IN (
  'TEXT', 'TEXTAREA', 'RICH_TEXT', 'NUMBER', 'CURRENCY', 'PERCENTAGE', 'DATE',
  'YES_NO', 'CHECKBOX', 'SINGLE_SELECT', 'MULTI_SELECT', 'DOCUMENT', 'REPEATABLE_GROUP',
  'SCORE', 'SCORING_AGGREGATE'
));
--> statement-breakpoint
ALTER TABLE app_form_fields DROP CONSTRAINT app_form_fields_number_limits_check;
ALTER TABLE app_form_fields ADD CONSTRAINT app_form_fields_number_limits_check CHECK (
  (minimum IS NULL AND maximum IS NULL) OR (
    type IN ('NUMBER', 'CURRENCY', 'PERCENTAGE', 'SCORE')
    AND (minimum IS NULL OR maximum IS NULL OR minimum <= maximum)
    AND (type <> 'PERCENTAGE' OR (coalesce(minimum, 0) >= 0 AND coalesce(maximum, 100) <= 100))
  )
);
--> statement-breakpoint
ALTER TABLE app_form_fields ADD CONSTRAINT app_form_fields_scoring_aggregate_check CHECK (
  (type = 'SCORING_AGGREGATE' AND scoring_aggregate IS NOT NULL AND jsonb_typeof(scoring_aggregate) = 'object')
  OR (type <> 'SCORING_AGGREGATE' AND scoring_aggregate IS NULL)
);
--> statement-breakpoint
ALTER TABLE app_form_fields ADD COLUMN workflow_document jsonb;
ALTER TABLE app_form_fields ADD CONSTRAINT app_form_fields_workflow_document_check CHECK (
  workflow_document IS NULL OR (type = 'DOCUMENT' AND jsonb_typeof(workflow_document) = 'object')
);
--> statement-breakpoint
CREATE TABLE app_workflow_form_migrations (
  source_version_id uuid PRIMARY KEY REFERENCES app_workflow_definition_versions(id),
  target_version_id uuid NOT NULL UNIQUE REFERENCES app_workflow_definition_versions(id),
  mapping jsonb NOT NULL,
  migrated_at timestamptz NOT NULL DEFAULT now()
);
