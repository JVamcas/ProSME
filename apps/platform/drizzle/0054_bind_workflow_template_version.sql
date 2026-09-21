ALTER TABLE "app_funding_calls"
  ADD COLUMN "workflow_template_version_id" uuid;
--> statement-breakpoint
ALTER TABLE "app_funding_calls"
  ADD CONSTRAINT "app_funding_calls_workflow_template_version_id_app_workflow_definition_versions_id_fk"
  FOREIGN KEY ("workflow_template_version_id")
  REFERENCES "public"."app_workflow_definition_versions"("id")
  ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "app_funding_calls_workflow_template_version_idx"
  ON "app_funding_calls" ("workflow_template_version_id");
