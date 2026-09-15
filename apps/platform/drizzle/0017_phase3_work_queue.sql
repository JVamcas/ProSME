ALTER TABLE "app_stage_task_instances"
  ADD COLUMN "claimed_at" timestamp with time zone;
--> statement-breakpoint
CREATE INDEX "app_stage_task_instances_queue_due_idx"
  ON "app_stage_task_instances" ("status", "due_at", "id");
--> statement-breakpoint
CREATE INDEX "app_stage_task_instances_user_queue_idx"
  ON "app_stage_task_instances" ("assignment_user_id", "status", "due_at", "id");
--> statement-breakpoint
CREATE INDEX "app_user_roles_role_user_idx"
  ON "app_user_roles" ("role_id", "user_id");
--> statement-breakpoint
CREATE TABLE "app_task_claim_commands" (
  "idempotency_key" text PRIMARY KEY NOT NULL,
  "task_instance_id" uuid NOT NULL,
  "actor_id" uuid NOT NULL,
  "claimed_at" timestamp with time zone NOT NULL,
  "row_version" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "app_task_claim_commands_task_fk"
    FOREIGN KEY ("task_instance_id") REFERENCES "app_stage_task_instances"("id")
    ON DELETE restrict,
  CONSTRAINT "app_task_claim_commands_actor_fk"
    FOREIGN KEY ("actor_id") REFERENCES "app_users"("id") ON DELETE restrict,
  CONSTRAINT "app_task_claim_commands_row_version_check"
    CHECK ("row_version" > 0)
);
--> statement-breakpoint
CREATE INDEX "app_task_claim_commands_task_idx"
  ON "app_task_claim_commands" ("task_instance_id");
--> statement-breakpoint
INSERT INTO "app_role_capabilities" ("role_id", "capability_id")
SELECT role_row."id", capability_row."id"
FROM "app_roles" role_row
CROSS JOIN "app_capabilities" capability_row
WHERE
  (role_row."code" IN (
    'programme_officer', 'sector_specialist', 'finance_officer',
    'approval_panel_member', 'system_administrator'
  ) AND capability_row."code" IN (
    'work_queue.read', 'workflow.task.read', 'workflow.task.claim'
  ))
  OR (role_row."code" = 'system_administrator' AND capability_row."code" IN (
    'workflow.task.assign', 'workflow.task.complete', 'application.screen',
    'application.request_information'
  ))
  OR (role_row."code" = 'programme_officer' AND capability_row."code" IN (
    'workflow.task.complete', 'application.screen',
    'application.request_information'
  ))
ON CONFLICT ("role_id", "capability_id") DO NOTHING;
