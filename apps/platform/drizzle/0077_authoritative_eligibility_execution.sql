ALTER TABLE "app_authoritative_eligibility_outcomes"
  DROP CONSTRAINT IF EXISTS "app_authoritative_eligibility_outcomes_application_unique";
--> statement-breakpoint
DROP INDEX IF EXISTS "app_authoritative_eligibility_outcomes_application_unique";
--> statement-breakpoint
ALTER TABLE "app_authoritative_eligibility_outcomes"
  ADD COLUMN "evaluation_number" integer DEFAULT 1 NOT NULL,
  ADD COLUMN "workflow_task_id" uuid,
  ADD COLUMN "command_key" text;
--> statement-breakpoint
ALTER TABLE "app_authoritative_eligibility_outcomes"
  ALTER COLUMN "evaluation_number" DROP DEFAULT,
  ADD CONSTRAINT "app_authoritative_eligibility_outcomes_task_fk"
    FOREIGN KEY ("workflow_task_id") REFERENCES "app_workflow_tasks"("id")
    ON DELETE restrict,
  ADD CONSTRAINT "app_authoritative_eligibility_outcomes_evaluation_number_check"
    CHECK ("evaluation_number" > 0);
--> statement-breakpoint
CREATE UNIQUE INDEX "app_authoritative_eligibility_outcomes_application_number_unique"
  ON "app_authoritative_eligibility_outcomes" ("application_id", "evaluation_number");
--> statement-breakpoint
CREATE UNIQUE INDEX "app_authoritative_eligibility_outcomes_command_unique"
  ON "app_authoritative_eligibility_outcomes" ("command_key")
  WHERE "command_key" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX "app_authoritative_eligibility_outcomes_application_latest_idx"
  ON "app_authoritative_eligibility_outcomes" ("application_id", "evaluation_number");
