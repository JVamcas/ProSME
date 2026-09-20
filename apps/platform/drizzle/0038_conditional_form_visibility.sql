ALTER TABLE "app_form_sections"
  ADD COLUMN "visibility_condition" jsonb;
--> statement-breakpoint

ALTER TABLE "app_form_fields"
  ADD COLUMN "visibility_condition" jsonb;
--> statement-breakpoint

ALTER TABLE "app_form_sections"
  ADD CONSTRAINT "app_form_sections_visibility_condition_check"
  CHECK (
    "visibility_condition" IS NULL
    OR (
      jsonb_typeof("visibility_condition") = 'object'
      AND "visibility_condition"->>'kind' = 'GROUP'
      AND jsonb_typeof("visibility_condition"->'children') = 'array'
    )
  );
--> statement-breakpoint

ALTER TABLE "app_form_fields"
  ADD CONSTRAINT "app_form_fields_visibility_condition_check"
  CHECK (
    "visibility_condition" IS NULL
    OR (
      jsonb_typeof("visibility_condition") = 'object'
      AND "visibility_condition"->>'kind' = 'GROUP'
      AND jsonb_typeof("visibility_condition"->'children') = 'array'
    )
  );
