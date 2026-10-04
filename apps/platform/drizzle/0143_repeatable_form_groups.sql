ALTER TABLE app_form_fields
  ADD COLUMN repeatable_configuration jsonb;
--> statement-breakpoint
ALTER TABLE app_form_fields
  DROP CONSTRAINT app_form_fields_type_check;
--> statement-breakpoint
ALTER TABLE app_form_fields
  ADD CONSTRAINT app_form_fields_type_check CHECK (type IN (
    'TEXT', 'TEXTAREA', 'RICH_TEXT', 'NUMBER', 'CURRENCY', 'PERCENTAGE', 'DATE',
    'YES_NO', 'SINGLE_SELECT', 'MULTI_SELECT', 'DOCUMENT', 'REPEATABLE_GROUP'
  ));
--> statement-breakpoint
ALTER TABLE app_form_fields
  ADD CONSTRAINT app_form_fields_repeatable_configuration_check CHECK (
    (
      type = 'REPEATABLE_GROUP'
      AND repeatable_configuration IS NOT NULL
      AND jsonb_typeof(repeatable_configuration) = 'object'
      AND jsonb_typeof(repeatable_configuration->'fields') = 'array'
    )
    OR (type <> 'REPEATABLE_GROUP' AND repeatable_configuration IS NULL)
  );
