UPDATE "app_workflow_tasks"
SET "status" = 'PENDING'
WHERE "status" = 'CLAIMED';
--> statement-breakpoint
ALTER TABLE "app_workflow_tasks"
  DROP CONSTRAINT "app_workflow_tasks_status_check";
--> statement-breakpoint
ALTER TABLE "app_workflow_tasks"
  ADD CONSTRAINT "app_workflow_tasks_status_check"
  CHECK ("status" IN (
    'PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
  ));
