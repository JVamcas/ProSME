CREATE TABLE "app_workflow_reworks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "action_execution_id" uuid NOT NULL,
  "workflow_instance_id" uuid NOT NULL,
  "source_stage_instance_id" uuid NOT NULL,
  "source_task_id" uuid,
  "target_stage_instance_id" uuid NOT NULL,
  "continuation_stage_instance_id" uuid,
  "reason" text NOT NULL,
  "data_handling" text NOT NULL,
  "created_by" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "app_workflow_reworks_reason_check"
    CHECK (length(btrim("reason")) > 0),
  CONSTRAINT "app_workflow_reworks_data_handling_check"
    CHECK ("data_handling" in ('RETAIN', 'CLEAR'))
);
--> statement-breakpoint
CREATE TABLE "app_workflow_referrals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "action_execution_id" uuid NOT NULL,
  "workflow_instance_id" uuid NOT NULL,
  "source_stage_instance_id" uuid NOT NULL,
  "source_task_id" uuid NOT NULL,
  "referred_stage_instance_id" uuid NOT NULL,
  "question" text NOT NULL,
  "source_task_behavior" text NOT NULL,
  "return_to_referrer" text NOT NULL,
  "status" text DEFAULT 'ACTIVE' NOT NULL,
  "referred_by" uuid NOT NULL,
  "referred_at" timestamp with time zone DEFAULT now() NOT NULL,
  "resolved_by" uuid,
  "resolved_at" timestamp with time zone,
  CONSTRAINT "app_workflow_referrals_question_check"
    CHECK (length(btrim("question")) > 0),
  CONSTRAINT "app_workflow_referrals_behavior_check"
    CHECK ("source_task_behavior" in ('BLOCKED', 'OPEN')),
  CONSTRAINT "app_workflow_referrals_return_check"
    CHECK ("return_to_referrer" in ('YES', 'NO')),
  CONSTRAINT "app_workflow_referrals_status_check"
    CHECK ("status" in ('ACTIVE', 'COMPLETED'))
);
--> statement-breakpoint
CREATE TABLE "app_workflow_holds" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "action_execution_id" uuid NOT NULL,
  "workflow_instance_id" uuid NOT NULL,
  "stage_instance_id" uuid NOT NULL,
  "task_id" uuid,
  "scope" text DEFAULT 'STAGE' NOT NULL,
  "previous_stage_status" text NOT NULL,
  "reason_code" text,
  "comment" text,
  "review_at" timestamp with time zone,
  "status" text DEFAULT 'ACTIVE' NOT NULL,
  "held_by" uuid NOT NULL,
  "held_at" timestamp with time zone DEFAULT now() NOT NULL,
  "resumed_by" uuid,
  "resumed_at" timestamp with time zone,
  CONSTRAINT "app_workflow_holds_scope_check" CHECK ("scope" = 'STAGE'),
  CONSTRAINT "app_workflow_holds_status_check"
    CHECK ("status" in ('ACTIVE', 'RESUMED')),
  CONSTRAINT "app_workflow_holds_reason_check"
    CHECK ("reason_code" is not null OR length(btrim(coalesce("comment", ''))) > 0)
);
--> statement-breakpoint
ALTER TABLE "app_workflow_reworks" ADD CONSTRAINT "app_workflow_reworks_action_execution_id_fk" FOREIGN KEY ("action_execution_id") REFERENCES "app_workflow_action_executions"("id") ON DELETE restrict;
ALTER TABLE "app_workflow_reworks" ADD CONSTRAINT "app_workflow_reworks_workflow_instance_id_fk" FOREIGN KEY ("workflow_instance_id") REFERENCES "app_workflow_instances"("id") ON DELETE restrict;
ALTER TABLE "app_workflow_reworks" ADD CONSTRAINT "app_workflow_reworks_source_stage_instance_id_fk" FOREIGN KEY ("source_stage_instance_id") REFERENCES "app_workflow_stage_instances"("id") ON DELETE restrict;
ALTER TABLE "app_workflow_reworks" ADD CONSTRAINT "app_workflow_reworks_source_task_id_fk" FOREIGN KEY ("source_task_id") REFERENCES "app_workflow_tasks"("id") ON DELETE restrict;
ALTER TABLE "app_workflow_reworks" ADD CONSTRAINT "app_workflow_reworks_target_stage_instance_id_fk" FOREIGN KEY ("target_stage_instance_id") REFERENCES "app_workflow_stage_instances"("id") ON DELETE restrict;
ALTER TABLE "app_workflow_reworks" ADD CONSTRAINT "app_workflow_reworks_continuation_stage_instance_id_fk" FOREIGN KEY ("continuation_stage_instance_id") REFERENCES "app_workflow_stage_instances"("id") ON DELETE restrict;
ALTER TABLE "app_workflow_reworks" ADD CONSTRAINT "app_workflow_reworks_created_by_fk" FOREIGN KEY ("created_by") REFERENCES "app_users"("id") ON DELETE restrict;
--> statement-breakpoint
ALTER TABLE "app_workflow_referrals" ADD CONSTRAINT "app_workflow_referrals_action_execution_id_fk" FOREIGN KEY ("action_execution_id") REFERENCES "app_workflow_action_executions"("id") ON DELETE restrict;
ALTER TABLE "app_workflow_referrals" ADD CONSTRAINT "app_workflow_referrals_workflow_instance_id_fk" FOREIGN KEY ("workflow_instance_id") REFERENCES "app_workflow_instances"("id") ON DELETE restrict;
ALTER TABLE "app_workflow_referrals" ADD CONSTRAINT "app_workflow_referrals_source_stage_instance_id_fk" FOREIGN KEY ("source_stage_instance_id") REFERENCES "app_workflow_stage_instances"("id") ON DELETE restrict;
ALTER TABLE "app_workflow_referrals" ADD CONSTRAINT "app_workflow_referrals_source_task_id_fk" FOREIGN KEY ("source_task_id") REFERENCES "app_workflow_tasks"("id") ON DELETE restrict;
ALTER TABLE "app_workflow_referrals" ADD CONSTRAINT "app_workflow_referrals_referred_stage_instance_id_fk" FOREIGN KEY ("referred_stage_instance_id") REFERENCES "app_workflow_stage_instances"("id") ON DELETE restrict;
ALTER TABLE "app_workflow_referrals" ADD CONSTRAINT "app_workflow_referrals_referred_by_fk" FOREIGN KEY ("referred_by") REFERENCES "app_users"("id") ON DELETE restrict;
ALTER TABLE "app_workflow_referrals" ADD CONSTRAINT "app_workflow_referrals_resolved_by_fk" FOREIGN KEY ("resolved_by") REFERENCES "app_users"("id") ON DELETE restrict;
--> statement-breakpoint
ALTER TABLE "app_workflow_holds" ADD CONSTRAINT "app_workflow_holds_action_execution_id_fk" FOREIGN KEY ("action_execution_id") REFERENCES "app_workflow_action_executions"("id") ON DELETE restrict;
ALTER TABLE "app_workflow_holds" ADD CONSTRAINT "app_workflow_holds_workflow_instance_id_fk" FOREIGN KEY ("workflow_instance_id") REFERENCES "app_workflow_instances"("id") ON DELETE restrict;
ALTER TABLE "app_workflow_holds" ADD CONSTRAINT "app_workflow_holds_stage_instance_id_fk" FOREIGN KEY ("stage_instance_id") REFERENCES "app_workflow_stage_instances"("id") ON DELETE restrict;
ALTER TABLE "app_workflow_holds" ADD CONSTRAINT "app_workflow_holds_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "app_workflow_tasks"("id") ON DELETE restrict;
ALTER TABLE "app_workflow_holds" ADD CONSTRAINT "app_workflow_holds_held_by_fk" FOREIGN KEY ("held_by") REFERENCES "app_users"("id") ON DELETE restrict;
ALTER TABLE "app_workflow_holds" ADD CONSTRAINT "app_workflow_holds_resumed_by_fk" FOREIGN KEY ("resumed_by") REFERENCES "app_users"("id") ON DELETE restrict;
--> statement-breakpoint
CREATE UNIQUE INDEX "app_workflow_reworks_execution_unique" ON "app_workflow_reworks" ("action_execution_id");
CREATE INDEX "app_workflow_reworks_runtime_idx" ON "app_workflow_reworks" ("workflow_instance_id", "created_at");
CREATE UNIQUE INDEX "app_workflow_referrals_execution_unique" ON "app_workflow_referrals" ("action_execution_id");
CREATE UNIQUE INDEX "app_workflow_referrals_active_source_unique" ON "app_workflow_referrals" ("source_task_id") WHERE "status" = 'ACTIVE';
CREATE INDEX "app_workflow_referrals_referred_stage_idx" ON "app_workflow_referrals" ("referred_stage_instance_id", "status");
CREATE UNIQUE INDEX "app_workflow_holds_execution_unique" ON "app_workflow_holds" ("action_execution_id");
CREATE UNIQUE INDEX "app_workflow_holds_active_stage_unique" ON "app_workflow_holds" ("stage_instance_id") WHERE "status" = 'ACTIVE';
CREATE INDEX "app_workflow_holds_runtime_idx" ON "app_workflow_holds" ("workflow_instance_id", "held_at");
--> statement-breakpoint
ALTER TABLE "app_workflow_action_definitions"
  DROP CONSTRAINT "app_workflow_actions_type_check",
  ADD CONSTRAINT "app_workflow_actions_type_check"
    CHECK (action_type IN (
      'APPROVE_ADVANCE',
      'REJECT',
      'REQUEST_INFORMATION',
      'RETURN',
      'REFER',
      'ESCALATE',
      'PUT_ON_HOLD',
      'WITHDRAW',
      'DEFER',
      'RESUME'
    ));
--> statement-breakpoint
ALTER TABLE app_workflow_action_definitions
  DISABLE TRIGGER app_workflow_actions_immutable;
--> statement-breakpoint
UPDATE app_workflow_action_definitions
SET configuration = configuration || '{"sourceTaskBehavior":"BLOCKED"}'::jsonb
WHERE action_type = 'REFER'
  AND NOT configuration ? 'sourceTaskBehavior';
--> statement-breakpoint
UPDATE app_workflow_action_definitions
SET configuration = configuration || '{"scope":"STAGE"}'::jsonb
WHERE action_type = 'PUT_ON_HOLD'
  AND NOT configuration ? 'scope';
--> statement-breakpoint
INSERT INTO app_workflow_action_definitions (
  stage_id, stable_key, label, action_type, enabled,
  reason_code_required, display_order, configuration
)
SELECT hold.stage_id, 'RESUME', 'Resume', 'RESUME', true, false,
  max(existing.display_order) + 1, '{"scope":"STAGE"}'::jsonb
FROM app_workflow_action_definitions hold
JOIN app_workflow_action_definitions existing ON existing.stage_id = hold.stage_id
WHERE hold.action_type = 'PUT_ON_HOLD'
  AND NOT EXISTS (
    SELECT 1 FROM app_workflow_action_definitions resume
    WHERE resume.stage_id = hold.stage_id AND resume.stable_key = 'RESUME'
  )
GROUP BY hold.stage_id;
--> statement-breakpoint
INSERT INTO app_stage_task_action_bindings (
  stage_id, task_definition_id, action_key
)
SELECT binding.stage_id, binding.task_definition_id, 'RESUME'
FROM app_stage_task_action_bindings binding
JOIN app_workflow_action_definitions hold
  ON hold.stage_id = binding.stage_id
  AND hold.stable_key = binding.action_key
  AND hold.action_type = 'PUT_ON_HOLD'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
ALTER TABLE app_workflow_action_definitions
  ENABLE TRIGGER app_workflow_actions_immutable;
--> statement-breakpoint
ALTER TABLE app_workflow_stage_definitions
  DISABLE TRIGGER app_workflow_stages_immutable;
--> statement-breakpoint
UPDATE app_workflow_stage_definitions target_stage
SET repeatable = true
WHERE EXISTS (
  SELECT 1
  FROM app_workflow_transition_targets transition_target
  JOIN app_workflow_transition_definitions transition
    ON transition.id = transition_target.transition_id
  JOIN app_workflow_action_definitions action
    ON action.stage_id = transition.from_stage_id
    AND action.stable_key = transition.action_key
  WHERE transition_target.target_stage_id = target_stage.id
    AND action.action_type IN ('RETURN', 'REFER')
);
--> statement-breakpoint
ALTER TABLE app_workflow_stage_definitions
  ENABLE TRIGGER app_workflow_stages_immutable;
