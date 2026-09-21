CREATE TABLE "app_workflow_transition_executions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workflow_instance_id" uuid NOT NULL,
  "source_stage_instance_id" uuid NOT NULL,
  "transition_definition_id" uuid NOT NULL,
  "action_key" text NOT NULL,
  "target_stage_definition_id" uuid,
  "target_stage_instance_id" uuid,
  "outcome" text DEFAULT 'RECORDED' NOT NULL,
  "condition_evaluation" jsonb NOT NULL,
  "actor_id" uuid NOT NULL,
  "correlation_id" uuid NOT NULL,
  "executed_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "app_workflow_transition_executions_outcome_check"
    CHECK ("outcome" IN (
      'RECORDED',
      'TARGET_ACTIVATED',
      'TARGET_ENTRY_CONDITION_FAILED',
      'WORKFLOW_COMPLETED'
    )),
  CONSTRAINT "app_workflow_transition_executions_workflow_fk"
    FOREIGN KEY ("workflow_instance_id")
    REFERENCES "app_workflow_instances"("id") ON DELETE restrict,
  CONSTRAINT "app_workflow_transition_executions_source_fk"
    FOREIGN KEY ("source_stage_instance_id")
    REFERENCES "app_workflow_stage_instances"("id") ON DELETE restrict,
  CONSTRAINT "app_workflow_transition_executions_definition_fk"
    FOREIGN KEY ("transition_definition_id")
    REFERENCES "app_workflow_transition_definitions"("id") ON DELETE restrict,
  CONSTRAINT "app_workflow_transition_executions_target_definition_fk"
    FOREIGN KEY ("target_stage_definition_id")
    REFERENCES "app_workflow_stage_definitions"("id") ON DELETE restrict,
  CONSTRAINT "app_workflow_transition_executions_target_instance_fk"
    FOREIGN KEY ("target_stage_instance_id")
    REFERENCES "app_workflow_stage_instances"("id") ON DELETE restrict,
  CONSTRAINT "app_workflow_transition_executions_actor_fk"
    FOREIGN KEY ("actor_id") REFERENCES "app_users"("id") ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX "app_workflow_transition_executions_source_unique"
  ON "app_workflow_transition_executions" ("source_stage_instance_id");
--> statement-breakpoint
CREATE INDEX "app_workflow_transition_executions_instance_idx"
  ON "app_workflow_transition_executions" (
    "workflow_instance_id",
    "executed_at"
  );
