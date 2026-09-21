ALTER TABLE "app_form_submissions"
  RENAME TO "app_form_responses";
--> statement-breakpoint
ALTER TABLE "app_form_responses"
  RENAME COLUMN "task_instance_id" TO "workflow_task_id";
--> statement-breakpoint
ALTER TABLE "app_form_responses"
  ADD COLUMN "respondent_user_id" uuid;
--> statement-breakpoint
UPDATE "app_form_responses"
SET "respondent_user_id" = "created_by";
--> statement-breakpoint
ALTER TABLE "app_form_responses"
  ALTER COLUMN "respondent_user_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "app_form_responses"
  ADD CONSTRAINT "app_form_responses_respondent_user_fk"
  FOREIGN KEY ("respondent_user_id") REFERENCES "app_users" ("id")
  ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "app_form_responses"
  DROP CONSTRAINT IF EXISTS "app_form_submissions_task_instance_id_key";
--> statement-breakpoint
DROP INDEX IF EXISTS "app_form_submissions_task_unique";
--> statement-breakpoint
ALTER TABLE "app_form_responses"
  RENAME CONSTRAINT "app_form_submissions_status_check"
  TO "app_form_responses_status_check";
--> statement-breakpoint
ALTER TABLE "app_form_responses"
  RENAME CONSTRAINT "app_form_submissions_row_version_check"
  TO "app_form_responses_row_version_check";
--> statement-breakpoint
ALTER TABLE "app_form_responses"
  RENAME CONSTRAINT "app_form_submissions_completion_snapshot_check"
  TO "app_form_responses_completion_snapshot_check";
--> statement-breakpoint
ALTER TABLE "app_form_responses"
  RENAME CONSTRAINT "app_form_submissions_task_instance_id_fkey"
  TO "app_form_responses_workflow_task_fk";
--> statement-breakpoint
ALTER TABLE "app_form_responses"
  RENAME CONSTRAINT "app_form_submissions_form_version_id_fkey"
  TO "app_form_responses_form_version_fk";
--> statement-breakpoint
ALTER TABLE "app_form_responses"
  RENAME CONSTRAINT "app_form_submissions_created_by_fkey"
  TO "app_form_responses_created_by_fk";
--> statement-breakpoint
ALTER TABLE "app_form_responses"
  RENAME CONSTRAINT "app_form_submissions_updated_by_fkey"
  TO "app_form_responses_updated_by_fk";
--> statement-breakpoint
ALTER INDEX "app_form_submissions_pkey"
  RENAME TO "app_form_responses_pkey";
--> statement-breakpoint
ALTER INDEX "app_form_submissions_version_idx"
  RENAME TO "app_form_responses_version_idx";
--> statement-breakpoint
CREATE UNIQUE INDEX "app_form_responses_task_reviewer_unique"
  ON "app_form_responses" ("workflow_task_id", "respondent_user_id");
--> statement-breakpoint
CREATE INDEX "app_form_responses_task_idx"
  ON "app_form_responses" ("workflow_task_id");
--> statement-breakpoint
DROP TRIGGER "app_form_submissions_immutable" ON "app_form_responses";
--> statement-breakpoint
ALTER FUNCTION "protect_completed_form_submission"()
  RENAME TO "protect_completed_form_response";
--> statement-breakpoint
CREATE OR REPLACE FUNCTION protect_completed_form_response()
RETURNS trigger AS $$
BEGIN
  IF OLD.status = 'COMPLETED' THEN
    RAISE EXCEPTION 'completed form responses are immutable';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER app_form_responses_immutable
BEFORE UPDATE OR DELETE ON app_form_responses
FOR EACH ROW EXECUTE FUNCTION protect_completed_form_response();
