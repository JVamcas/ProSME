CREATE TABLE "app_application_submission_snapshots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "application_id" uuid NOT NULL,
  "application_row_version" integer NOT NULL,
  "response_row_version" integer NOT NULL,
  "form_version_id" uuid NOT NULL,
  "eligibility_rule_set_version_id" uuid NOT NULL,
  "workflow_template_version_id" uuid NOT NULL,
  "application_data" jsonb NOT NULL,
  "business_data" jsonb NOT NULL,
  "declaration_acceptance" jsonb NOT NULL,
  "document_versions" jsonb NOT NULL,
  "normalized_form_values" jsonb NOT NULL,
  "submitted_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "app_submission_snapshots_application_fk"
    FOREIGN KEY ("application_id") REFERENCES "app_applications"("id")
    ON DELETE restrict,
  CONSTRAINT "app_submission_snapshots_form_version_fk"
    FOREIGN KEY ("form_version_id") REFERENCES "app_form_versions"("id")
    ON DELETE restrict,
  CONSTRAINT "app_submission_snapshots_eligibility_version_fk"
    FOREIGN KEY ("eligibility_rule_set_version_id")
    REFERENCES "app_eligibility_rule_set_versions"("id") ON DELETE restrict,
  CONSTRAINT "app_submission_snapshots_workflow_version_fk"
    FOREIGN KEY ("workflow_template_version_id")
    REFERENCES "app_workflow_definition_versions"("id") ON DELETE restrict,
  CONSTRAINT "app_submission_snapshots_versions_check"
    CHECK ("application_row_version" > 0 AND "response_row_version" > 0),
  CONSTRAINT "app_submission_snapshots_json_check"
    CHECK (
      jsonb_typeof("application_data") = 'object'
      AND jsonb_typeof("business_data") = 'object'
      AND jsonb_typeof("declaration_acceptance") = 'object'
      AND jsonb_typeof("document_versions") = 'array'
      AND jsonb_typeof("normalized_form_values") = 'object'
    )
);
--> statement-breakpoint
CREATE UNIQUE INDEX "app_submission_snapshots_application_unique"
  ON "app_application_submission_snapshots" ("application_id");
--> statement-breakpoint
ALTER TABLE "app_applications"
  ADD CONSTRAINT "app_applications_submission_snapshot_fk"
  FOREIGN KEY ("submission_snapshot_id")
  REFERENCES "app_application_submission_snapshots"("id") ON DELETE restrict;
--> statement-breakpoint
ALTER TABLE "app_application_submission_commands"
  ADD COLUMN "request_fingerprint" text;
--> statement-breakpoint
UPDATE "app_application_submission_commands"
SET "request_fingerprint" = md5(
  "application_id"::text || ':' || "idempotency_key"
)
WHERE "request_fingerprint" IS NULL;
--> statement-breakpoint
ALTER TABLE "app_application_submission_commands"
  ALTER COLUMN "request_fingerprint" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "app_application_audit_entries"
  DROP CONSTRAINT "app_application_audit_entries_action_check",
  ADD CONSTRAINT "app_application_audit_entries_action_check"
    CHECK ("action" IN (
      'APPLICATION_DRAFT_CREATED',
      'APPLICATION_DRAFT_SAVED',
      'APPLICATION_SUBMITTED'
    ));
