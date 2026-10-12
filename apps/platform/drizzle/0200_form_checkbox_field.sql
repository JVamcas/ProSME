ALTER TABLE app_form_fields
  DROP CONSTRAINT app_form_fields_type_check;
--> statement-breakpoint
ALTER TABLE app_form_fields
  ADD CONSTRAINT app_form_fields_type_check
  CHECK (type IN (
    'TEXT', 'TEXTAREA', 'RICH_TEXT', 'NUMBER', 'CURRENCY', 'PERCENTAGE',
    'DATE', 'YES_NO', 'CHECKBOX', 'SINGLE_SELECT', 'MULTI_SELECT',
    'DOCUMENT', 'REPEATABLE_GROUP'
  ));
