CREATE TABLE "app_workflow_stage_comment_fields" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "stage_id" uuid NOT NULL REFERENCES "app_workflow_stage_definitions"("id") ON DELETE RESTRICT,
  "task_definition_id" uuid NOT NULL REFERENCES "app_stage_task_definitions"("id") ON DELETE RESTRICT,
  "key" text NOT NULL,
  "label" text NOT NULL,
  "help_text" text DEFAULT '' NOT NULL,
  "mandatory" boolean DEFAULT false NOT NULL,
  "visibility" text NOT NULL,
  "display_order" integer NOT NULL,
  CONSTRAINT "app_stage_comments_visibility_check"
    CHECK ("visibility" IN ('APPLICANT_VISIBLE', 'INTERNAL_ONLY')),
  CONSTRAINT "app_stage_comments_order_check" CHECK ("display_order" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "app_stage_comments_stage_key_unique"
  ON "app_workflow_stage_comment_fields" ("stage_id", "key");
--> statement-breakpoint
CREATE UNIQUE INDEX "app_stage_comments_stage_order_unique"
  ON "app_workflow_stage_comment_fields" ("stage_id", "display_order");
--> statement-breakpoint
CREATE INDEX "app_stage_comments_task_idx"
  ON "app_workflow_stage_comment_fields" ("task_definition_id");
