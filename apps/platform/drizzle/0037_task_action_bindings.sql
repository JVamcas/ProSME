CREATE UNIQUE INDEX "app_stage_tasks_id_stage_unique"
  ON "app_stage_task_definitions" ("id", "stage_id");
--> statement-breakpoint
CREATE TABLE "app_stage_task_action_bindings" (
  "task_definition_id" uuid NOT NULL,
  "stage_id" uuid NOT NULL,
  "action_key" text NOT NULL,
  CONSTRAINT "app_task_action_bindings_task_stage_fk"
    FOREIGN KEY ("task_definition_id", "stage_id")
    REFERENCES "app_stage_task_definitions" ("id", "stage_id")
    ON DELETE RESTRICT,
  CONSTRAINT "app_task_action_bindings_stage_action_fk"
    FOREIGN KEY ("stage_id", "action_key")
    REFERENCES "app_workflow_action_definitions" ("stage_id", "stable_key")
    ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE UNIQUE INDEX "app_task_action_bindings_unique"
  ON "app_stage_task_action_bindings" ("task_definition_id", "action_key");
--> statement-breakpoint
CREATE INDEX "app_task_action_bindings_stage_idx"
  ON "app_stage_task_action_bindings" ("stage_id");
