ALTER TABLE "app_form_fields" ADD COLUMN "rules" jsonb;
--> statement-breakpoint
ALTER TABLE "app_form_fields" ADD CONSTRAINT "app_form_fields_rules_check"
CHECK ("rules" IS NULL OR jsonb_typeof("rules") = 'object');
