INSERT INTO "app_capabilities" ("code", "description") VALUES
  (
    'workflow.task.assigned.decide',
    'Complete an assigned task using its configured decision actions'
  )
ON CONFLICT ("code") DO UPDATE
SET "description" = EXCLUDED."description";
--> statement-breakpoint
INSERT INTO "app_role_capabilities" ("role_id", "capability_id")
SELECT existing_grant."role_id", decide_permission."id"
FROM "app_role_capabilities" existing_grant
JOIN "app_capabilities" process_permission
  ON process_permission."id" = existing_grant."capability_id"
CROSS JOIN "app_capabilities" decide_permission
WHERE process_permission."code" = 'workflow.task.assigned.process'
  AND decide_permission."code" = 'workflow.task.assigned.decide'
ON CONFLICT ("role_id", "capability_id") DO NOTHING;
--> statement-breakpoint
ALTER TABLE "app_stage_task_definitions"
  ADD COLUMN "permissions" jsonb;
--> statement-breakpoint
UPDATE "app_stage_task_definitions"
SET "permissions" = jsonb_build_object(
  'view', 'workflow.task.assigned.read',
  'edit', 'workflow.task.assigned.process',
  'decide', 'workflow.task.assigned.decide',
  'visibility', 'INTERNAL_ONLY'
);
--> statement-breakpoint
ALTER TABLE "app_stage_task_definitions"
  ALTER COLUMN "permissions" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "app_stage_task_definitions"
  ADD CONSTRAINT "app_stage_tasks_permissions_shape_check" CHECK (
    jsonb_typeof("permissions") = 'object'
    AND jsonb_typeof("permissions"->'view') = 'string'
    AND jsonb_typeof("permissions"->'edit') = 'string'
    AND jsonb_typeof("permissions"->'decide') = 'string'
    AND "permissions"->>'visibility' IN (
      'APPLICANT_VISIBLE',
      'INTERNAL_ONLY'
    )
  );
