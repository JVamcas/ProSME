ALTER TABLE "app_form_versions"
ADD COLUMN "display_mode" text DEFAULT 'SINGLE_PAGE' NOT NULL;
--> statement-breakpoint
ALTER TABLE "app_form_versions"
ADD CONSTRAINT "app_form_versions_display_mode_check"
CHECK ("app_form_versions"."display_mode" in ('SINGLE_PAGE', 'STEPS'));
