-- Adds an explicit comment field without rewriting immutable form versions or responses.
ALTER TABLE app_form_fields DROP CONSTRAINT IF EXISTS app_form_fields_type_check;
--> statement-breakpoint
ALTER TABLE app_form_fields ADD CONSTRAINT app_form_fields_type_check
  CHECK (type IN ('TEXT', 'TEXTAREA', 'COMMENT', 'RICH_TEXT', 'NUMBER', 'CURRENCY',
    'PERCENTAGE', 'SCORE', 'SCORING_AGGREGATE', 'DATE', 'YES_NO', 'CHECKBOX',
    'SINGLE_SELECT', 'MULTI_SELECT', 'DOCUMENT', 'REPEATABLE_GROUP'));
--> statement-breakpoint
ALTER TABLE app_form_fields DROP CONSTRAINT IF EXISTS app_form_fields_length_limits_check;
--> statement-breakpoint
ALTER TABLE app_form_fields ADD CONSTRAINT app_form_fields_length_limits_check
  CHECK ((min_length IS NULL AND max_length IS NULL) OR
    (type IN ('TEXT', 'TEXTAREA', 'COMMENT') AND coalesce(min_length, 0) >= 0
      AND coalesce(max_length, 0) >= 0
      AND (min_length IS NULL OR max_length IS NULL OR min_length <= max_length)));
