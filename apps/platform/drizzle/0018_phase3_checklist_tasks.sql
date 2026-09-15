CREATE TABLE "app_task_completion_commands" (
  "idempotency_key" text PRIMARY KEY NOT NULL,
  "task_instance_id" uuid NOT NULL,
  "actor_id" uuid NOT NULL,
  "result" jsonb NOT NULL,
  "completed_at" timestamp with time zone NOT NULL,
  "row_version" integer NOT NULL,
  "next_stage_name" text,
  "workflow_status" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "app_task_completion_commands_task_fk"
    FOREIGN KEY ("task_instance_id") REFERENCES "app_stage_task_instances"("id")
    ON DELETE restrict,
  CONSTRAINT "app_task_completion_commands_actor_fk"
    FOREIGN KEY ("actor_id") REFERENCES "app_users"("id") ON DELETE restrict,
  CONSTRAINT "app_task_completion_commands_row_version_check"
    CHECK ("row_version" > 0),
  CONSTRAINT "app_task_completion_commands_workflow_status_check"
    CHECK ("workflow_status" IN ('ACTIVE', 'COMPLETED'))
);
--> statement-breakpoint
CREATE INDEX "app_task_completion_commands_task_idx"
  ON "app_task_completion_commands" ("task_instance_id");
--> statement-breakpoint
UPDATE "app_stage_task_definitions" task
SET
  "code" = 'PRE_SCREEN_CHECKLIST',
  "name" = 'Pre-screening checklist',
  "type" = 'CHECKLIST',
  "config" = '{"items":[{"code":"NAMIBIAN_OWNERSHIP","label":"At least 51% Namibian-owned","required":true},{"code":"STATUTORY_COMPLIANCE","label":"Compliant with relevant statutory institutions","required":true},{"code":"NIPDB_MSME_REGISTRATION","label":"Registered on the NIPDB MSME database","required":true},{"code":"OPERATING_HISTORY","label":"Operating for at least one year","required":true}]}'::jsonb
FROM "app_workflow_stage_definitions" stage
JOIN "app_workflow_definition_versions" version
  ON version."id" = stage."version_id"
WHERE task."stage_id" = stage."id"
  AND version."status" = 'DRAFT'
  AND task."code" = 'AUTOMATED_PRE_SCREEN';
