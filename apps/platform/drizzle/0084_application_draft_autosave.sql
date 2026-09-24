CREATE TABLE "app_application_draft_responses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "application_id" uuid NOT NULL,
  "form_version_id" uuid NOT NULL,
  "respondent_user_id" uuid NOT NULL,
  "values" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "row_version" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "app_application_draft_responses_application_fk"
    FOREIGN KEY ("application_id") REFERENCES "app_applications"("id")
    ON DELETE restrict,
  CONSTRAINT "app_application_draft_responses_form_version_fk"
    FOREIGN KEY ("form_version_id") REFERENCES "app_form_versions"("id")
    ON DELETE restrict,
  CONSTRAINT "app_application_draft_responses_respondent_fk"
    FOREIGN KEY ("respondent_user_id") REFERENCES "app_users"("id")
    ON DELETE restrict,
  CONSTRAINT "app_application_draft_responses_row_version_check"
    CHECK ("row_version" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "app_application_draft_responses_application_unique"
  ON "app_application_draft_responses" ("application_id");
--> statement-breakpoint
CREATE INDEX "app_application_draft_responses_form_version_idx"
  ON "app_application_draft_responses" ("form_version_id");
--> statement-breakpoint
INSERT INTO "app_application_draft_responses" (
  "application_id",
  "form_version_id",
  "respondent_user_id",
  "values"
)
SELECT
  "id",
  "form_version_id",
  "owner_user_id",
  '{}'::jsonb
FROM "app_applications"
WHERE "status" = 'draft' AND "form_version_id" IS NOT NULL;
--> statement-breakpoint
UPDATE "app_applications" AS application
SET
  "latest_draft_response_id" = response."id",
  "row_version" = application."row_version" + 1,
  "updated_at" = now()
FROM "app_application_draft_responses" AS response
WHERE response."application_id" = application."id"
  AND application."latest_draft_response_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "app_applications"
  ADD CONSTRAINT "app_applications_latest_draft_response_fk"
    FOREIGN KEY ("latest_draft_response_id")
    REFERENCES "app_application_draft_responses"("id") ON DELETE restrict;
--> statement-breakpoint
CREATE TABLE "app_application_commands" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actor_user_id" uuid NOT NULL,
  "application_id" uuid NOT NULL,
  "command_type" text NOT NULL,
  "idempotency_key" uuid NOT NULL,
  "request_fingerprint" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "app_application_commands_actor_fk"
    FOREIGN KEY ("actor_user_id") REFERENCES "app_users"("id")
    ON DELETE restrict,
  CONSTRAINT "app_application_commands_application_fk"
    FOREIGN KEY ("application_id") REFERENCES "app_applications"("id")
    ON DELETE restrict,
  CONSTRAINT "app_application_commands_type_check"
    CHECK ("command_type" IN ('CREATE_DRAFT', 'SAVE_DRAFT_RESPONSE'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "app_application_commands_actor_key_unique"
  ON "app_application_commands" ("actor_user_id", "idempotency_key");
--> statement-breakpoint
CREATE INDEX "app_application_commands_application_idx"
  ON "app_application_commands" ("application_id", "created_at");
--> statement-breakpoint
CREATE TABLE "app_application_audit_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "application_id" uuid NOT NULL,
  "actor_user_id" uuid NOT NULL,
  "action" text NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "correlation_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "app_application_audit_entries_application_fk"
    FOREIGN KEY ("application_id") REFERENCES "app_applications"("id")
    ON DELETE restrict,
  CONSTRAINT "app_application_audit_entries_actor_fk"
    FOREIGN KEY ("actor_user_id") REFERENCES "app_users"("id")
    ON DELETE restrict,
  CONSTRAINT "app_application_audit_entries_action_check"
    CHECK ("action" IN ('APPLICATION_DRAFT_CREATED', 'APPLICATION_DRAFT_SAVED'))
);
--> statement-breakpoint
CREATE INDEX "app_application_audit_entries_application_idx"
  ON "app_application_audit_entries" (
    "application_id", "created_at", "id"
  );
