ALTER TABLE "app_form_sections"
ADD COLUMN "show_container" boolean DEFAULT true NOT NULL;

ALTER TABLE "app_form_fields"
ADD COLUMN "column_span" integer DEFAULT 1 NOT NULL;

ALTER TABLE "app_form_fields"
ADD CONSTRAINT "app_form_fields_column_span_check"
CHECK ("column_span" IN (1, 2, 3));
