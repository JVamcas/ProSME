UPDATE "app_form_fields"
SET "type" = 'SINGLE_SELECT'
WHERE "type" = 'SELECT';

ALTER TABLE "app_form_fields"
DROP CONSTRAINT "app_form_fields_type_check";

ALTER TABLE "app_form_fields"
ADD CONSTRAINT "app_form_fields_type_check"
CHECK (
  "type" IN (
    'TEXT',
    'TEXTAREA',
    'NUMBER',
    'CURRENCY',
    'PERCENTAGE',
    'DATE',
    'YES_NO',
    'SINGLE_SELECT',
    'MULTI_SELECT',
    'DOCUMENT'
  )
);

ALTER TABLE "app_form_fields"
DROP CONSTRAINT "app_form_fields_number_limits_check";

ALTER TABLE "app_form_fields"
ADD CONSTRAINT "app_form_fields_number_limits_check"
CHECK (
  ("minimum" IS NULL AND "maximum" IS NULL)
  OR (
    "type" IN ('NUMBER', 'CURRENCY', 'PERCENTAGE')
    AND ("minimum" IS NULL OR "maximum" IS NULL OR "minimum" <= "maximum")
    AND (
      "type" <> 'PERCENTAGE'
      OR (
        coalesce("minimum", 0) >= 0
        AND coalesce("maximum", 100) <= 100
      )
    )
  )
);
