ALTER TABLE "app_funding_calls"
  ADD COLUMN "eligibility_rule_set_version_id" uuid;
--> statement-breakpoint
ALTER TABLE "app_funding_calls"
  ADD CONSTRAINT "app_funding_calls_eligibility_rule_set_version_id_app_eligibility_rule_set_versions_id_fk"
  FOREIGN KEY ("eligibility_rule_set_version_id")
  REFERENCES "public"."app_eligibility_rule_set_versions"("id")
  ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "app_funding_calls_eligibility_version_idx"
  ON "app_funding_calls" ("eligibility_rule_set_version_id");
--> statement-breakpoint
ALTER TABLE "app_applications"
  ADD COLUMN "eligibility_rule_set_version_id" uuid;
--> statement-breakpoint
ALTER TABLE "app_applications"
  ADD CONSTRAINT "app_applications_eligibility_rule_set_version_id_app_eligibility_rule_set_versions_id_fk"
  FOREIGN KEY ("eligibility_rule_set_version_id")
  REFERENCES "public"."app_eligibility_rule_set_versions"("id")
  ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "app_applications_eligibility_version_idx"
  ON "app_applications" ("eligibility_rule_set_version_id");
