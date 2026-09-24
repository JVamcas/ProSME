ALTER TABLE "app_workflow_stage_definitions"
  ADD COLUMN "entry_condition" jsonb;
--> statement-breakpoint

ALTER TABLE "app_workflow_stage_definitions"
  ADD COLUMN "exit_condition" jsonb;
--> statement-breakpoint

ALTER TABLE "app_workflow_stage_definitions"
  ADD CONSTRAINT "app_workflow_stages_entry_condition_check"
  CHECK (
    "entry_condition" IS NULL
    OR (
      jsonb_typeof("entry_condition") = 'object'
      AND "entry_condition"->>'kind' = 'GROUP'
      AND jsonb_typeof("entry_condition"->'children') = 'array'
    )
  );
--> statement-breakpoint

ALTER TABLE "app_workflow_stage_definitions"
  ADD CONSTRAINT "app_workflow_stages_exit_condition_check"
  CHECK (
    "exit_condition" IS NULL
    OR (
      jsonb_typeof("exit_condition") = 'object'
      AND "exit_condition"->>'kind' = 'GROUP'
      AND jsonb_typeof("exit_condition"->'children') = 'array'
    )
  );
