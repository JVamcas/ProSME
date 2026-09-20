ALTER TABLE "app_workflow_transition_definitions"
  ADD COLUMN "condition" jsonb;
--> statement-breakpoint

ALTER TABLE "app_workflow_transition_definitions"
  ADD CONSTRAINT "app_workflow_transitions_condition_check"
  CHECK (
    "condition" IS NULL
    OR (
      jsonb_typeof("condition") = 'object'
      AND "condition"->>'kind' = 'GROUP'
      AND jsonb_typeof("condition"->'children') = 'array'
    )
  );
