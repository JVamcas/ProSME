ALTER TABLE "app_workflow_stage_instances"
  ADD COLUMN "row_version" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "app_workflow_stage_instances"
  ADD CONSTRAINT "app_workflow_stage_instances_row_version_check"
  CHECK ("row_version" > 0);
--> statement-breakpoint
ALTER TABLE "app_workflow_action_definitions"
  ADD COLUMN "condition" jsonb;
--> statement-breakpoint
ALTER TABLE "app_workflow_action_definitions"
  ADD CONSTRAINT "app_workflow_actions_condition_check"
  CHECK (
    "condition" IS NULL
    OR (
      jsonb_typeof("condition") = 'object'
      AND "condition"->>'kind' = 'GROUP'
      AND jsonb_typeof("condition"->'children') = 'array'
    )
  );
--> statement-breakpoint
CREATE TABLE "app_workflow_action_executions" (
  "id" uuid PRIMARY KEY NOT NULL,
  "action_definition_id" uuid NOT NULL,
  "action_key" text NOT NULL,
  "action_type" text NOT NULL,
  "actor_type" text NOT NULL,
  "actor_id" uuid,
  "actor_identifier" text NOT NULL,
  "workflow_instance_id" uuid NOT NULL,
  "source_stage_instance_id" uuid NOT NULL,
  "task_id" uuid,
  "reason_code" text,
  "comment" text,
  "normalized_input" jsonb NOT NULL,
  "resolved_target" jsonb,
  "condition_evaluation" jsonb NOT NULL,
  "expected_runtime_version" integer NOT NULL,
  "resulting_runtime_version" integer NOT NULL,
  "result" jsonb NOT NULL,
  "idempotency_key" text NOT NULL,
  "correlation_id" uuid NOT NULL,
  "executed_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "app_workflow_action_executions_actor_type_check"
    CHECK (
      ("actor_type" = 'USER' AND "actor_id" IS NOT NULL)
      OR ("actor_type" = 'SYSTEM' AND "actor_id" IS NULL)
    ),
  CONSTRAINT "app_workflow_action_executions_version_check"
    CHECK (
      "expected_runtime_version" > 0
      AND "resulting_runtime_version" > "expected_runtime_version"
    ),
  CONSTRAINT "app_workflow_action_executions_input_check"
    CHECK (jsonb_typeof("normalized_input") = 'object'),
  CONSTRAINT "app_workflow_action_executions_condition_result_check"
    CHECK (jsonb_typeof("condition_evaluation") = 'object'),
  CONSTRAINT "app_workflow_action_executions_result_check"
    CHECK (jsonb_typeof("result") = 'object')
);
--> statement-breakpoint
ALTER TABLE "app_workflow_action_executions"
  ADD CONSTRAINT "app_workflow_action_executions_definition_fk"
  FOREIGN KEY ("action_definition_id")
  REFERENCES "public"."app_workflow_action_definitions"("id")
  ON DELETE restrict ON UPDATE no action,
  ADD CONSTRAINT "app_workflow_action_executions_actor_fk"
  FOREIGN KEY ("actor_id")
  REFERENCES "public"."app_users"("id")
  ON DELETE restrict ON UPDATE no action,
  ADD CONSTRAINT "app_workflow_action_executions_workflow_fk"
  FOREIGN KEY ("workflow_instance_id")
  REFERENCES "public"."app_workflow_instances"("id")
  ON DELETE restrict ON UPDATE no action,
  ADD CONSTRAINT "app_workflow_action_executions_stage_fk"
  FOREIGN KEY ("source_stage_instance_id")
  REFERENCES "public"."app_workflow_stage_instances"("id")
  ON DELETE restrict ON UPDATE no action,
  ADD CONSTRAINT "app_workflow_action_executions_task_fk"
  FOREIGN KEY ("task_id")
  REFERENCES "public"."app_workflow_tasks"("id")
  ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "app_workflow_action_executions_idempotency_unique"
  ON "app_workflow_action_executions" ("idempotency_key");
--> statement-breakpoint
CREATE INDEX "app_workflow_action_executions_runtime_idx"
  ON "app_workflow_action_executions" ("workflow_instance_id", "executed_at");
--> statement-breakpoint
CREATE INDEX "app_workflow_action_executions_stage_idx"
  ON "app_workflow_action_executions" ("source_stage_instance_id", "executed_at");
--> statement-breakpoint
CREATE FUNCTION "prevent_workflow_action_execution_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Workflow Action Execution records are immutable';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "app_workflow_action_executions_immutable"
BEFORE UPDATE OR DELETE ON "app_workflow_action_executions"
FOR EACH ROW EXECUTE FUNCTION "prevent_workflow_action_execution_mutation"();
