CREATE TABLE "app_workflow_decisions" (
  "id" uuid PRIMARY KEY NOT NULL,
  "action_execution_id" uuid NOT NULL,
  "action_definition_id" uuid NOT NULL,
  "action_key" text NOT NULL,
  "outcome" text NOT NULL,
  "actor_id" uuid NOT NULL,
  "workflow_instance_id" uuid NOT NULL,
  "source_stage_instance_id" uuid NOT NULL,
  "task_id" uuid,
  "input" jsonb NOT NULL,
  "decided_at" timestamp with time zone NOT NULL,
  CONSTRAINT "app_workflow_decisions_outcome_check"
    CHECK ("outcome" = 'APPROVED'),
  CONSTRAINT "app_workflow_decisions_input_check"
    CHECK (
      jsonb_typeof("input") = 'object'
      AND "input"->>'actionType' = 'APPROVE_ADVANCE'
    )
);
--> statement-breakpoint
ALTER TABLE "app_workflow_decisions"
  ADD CONSTRAINT "app_workflow_decisions_execution_fk"
  FOREIGN KEY ("action_execution_id")
  REFERENCES "public"."app_workflow_action_executions"("id")
  ON DELETE restrict ON UPDATE no action,
  ADD CONSTRAINT "app_workflow_decisions_definition_fk"
  FOREIGN KEY ("action_definition_id")
  REFERENCES "public"."app_workflow_action_definitions"("id")
  ON DELETE restrict ON UPDATE no action,
  ADD CONSTRAINT "app_workflow_decisions_actor_fk"
  FOREIGN KEY ("actor_id")
  REFERENCES "public"."app_users"("id")
  ON DELETE restrict ON UPDATE no action,
  ADD CONSTRAINT "app_workflow_decisions_workflow_fk"
  FOREIGN KEY ("workflow_instance_id")
  REFERENCES "public"."app_workflow_instances"("id")
  ON DELETE restrict ON UPDATE no action,
  ADD CONSTRAINT "app_workflow_decisions_stage_fk"
  FOREIGN KEY ("source_stage_instance_id")
  REFERENCES "public"."app_workflow_stage_instances"("id")
  ON DELETE restrict ON UPDATE no action,
  ADD CONSTRAINT "app_workflow_decisions_task_fk"
  FOREIGN KEY ("task_id")
  REFERENCES "public"."app_workflow_tasks"("id")
  ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "app_workflow_decisions_execution_unique"
  ON "app_workflow_decisions" ("action_execution_id");
--> statement-breakpoint
CREATE INDEX "app_workflow_decisions_instance_idx"
  ON "app_workflow_decisions" ("workflow_instance_id", "decided_at");
--> statement-breakpoint
CREATE INDEX "app_workflow_decisions_stage_idx"
  ON "app_workflow_decisions" ("source_stage_instance_id", "decided_at");
--> statement-breakpoint
CREATE FUNCTION "prevent_workflow_decision_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Workflow Decision records are immutable';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "app_workflow_decisions_immutable"
BEFORE UPDATE OR DELETE ON "app_workflow_decisions"
FOR EACH ROW EXECUTE FUNCTION "prevent_workflow_decision_mutation"();
