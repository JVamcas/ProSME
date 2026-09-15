ALTER TABLE "app_task_claim_commands"
  ADD COLUMN IF NOT EXISTS "row_version" integer;
--> statement-breakpoint
UPDATE "app_task_claim_commands"
SET "row_version" = 1
WHERE "row_version" IS NULL;
--> statement-breakpoint
ALTER TABLE "app_task_claim_commands"
  ALTER COLUMN "row_version" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "app_task_claim_commands"
  DROP CONSTRAINT IF EXISTS "app_task_claim_commands_row_version_check";
--> statement-breakpoint
ALTER TABLE "app_task_claim_commands"
  ADD CONSTRAINT "app_task_claim_commands_row_version_check"
  CHECK ("row_version" > 0);
