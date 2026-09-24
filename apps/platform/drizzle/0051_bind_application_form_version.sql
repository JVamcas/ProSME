ALTER TABLE "app_funding_calls"
  ADD COLUMN "form_version_id" uuid;
--> statement-breakpoint
ALTER TABLE "app_funding_calls"
  ADD CONSTRAINT "app_funding_calls_form_version_id_app_form_versions_id_fk"
  FOREIGN KEY ("form_version_id") REFERENCES "public"."app_form_versions"("id")
  ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "app_funding_calls_form_version_idx"
  ON "app_funding_calls" ("form_version_id");
--> statement-breakpoint
ALTER TABLE "app_applications"
  ADD COLUMN "form_version_id" uuid;
--> statement-breakpoint
ALTER TABLE "app_applications"
  ADD CONSTRAINT "app_applications_form_version_id_app_form_versions_id_fk"
  FOREIGN KEY ("form_version_id") REFERENCES "public"."app_form_versions"("id")
  ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "app_applications_form_version_idx"
  ON "app_applications" ("form_version_id");
