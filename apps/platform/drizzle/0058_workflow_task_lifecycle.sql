UPDATE "app_workflow_tasks"
SET "status" = CASE "status"
  WHEN 'READY' THEN 'PENDING'
  WHEN 'BLOCKED' THEN 'IN_PROGRESS'
  WHEN 'SKIPPED' THEN 'CANCELLED'
  ELSE "status"
END
WHERE "status" IN ('READY', 'BLOCKED', 'SKIPPED');
--> statement-breakpoint
ALTER TABLE "app_workflow_tasks"
  ALTER COLUMN "status" SET DEFAULT 'PENDING';
--> statement-breakpoint
ALTER TABLE "app_workflow_tasks"
  DROP CONSTRAINT "app_workflow_tasks_status_check";
--> statement-breakpoint
ALTER TABLE "app_workflow_tasks"
  ADD CONSTRAINT "app_workflow_tasks_status_check"
  CHECK ("status" IN (
    'PENDING', 'CLAIMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
  ));
--> statement-breakpoint
INSERT INTO "app_capabilities" ("code", "description")
VALUES ('workflow.task.cancel.all', 'Cancel any active workflow task')
ON CONFLICT ("code") DO UPDATE
SET "description" = EXCLUDED."description";
--> statement-breakpoint
INSERT INTO "app_role_capabilities" ("role_id", "capability_id")
SELECT role_row."id", capability_row."id"
FROM "app_roles" role_row
CROSS JOIN "app_capabilities" capability_row
WHERE role_row."code" = 'system_administrator'
  AND capability_row."code" = 'workflow.task.cancel.all'
ON CONFLICT ("role_id", "capability_id") DO NOTHING;
