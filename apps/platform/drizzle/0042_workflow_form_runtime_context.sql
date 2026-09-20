ALTER TABLE "app_stage_task_form_bindings"
  ADD COLUMN "context_fields" jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint

ALTER TABLE "app_stage_task_form_bindings"
  ALTER COLUMN "context_fields" DROP DEFAULT;
--> statement-breakpoint

ALTER TABLE "app_stage_task_form_bindings"
  ADD CONSTRAINT "app_task_form_bindings_context_fields_check"
  CHECK (jsonb_typeof("context_fields") = 'array');
