CREATE TABLE "app_workflow_deferrals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "action_execution_id" uuid NOT NULL,
  "workflow_instance_id" uuid NOT NULL,
  "stage_instance_id" uuid NOT NULL,
  "task_id" uuid,
  "mode" text NOT NULL,
  "continuation" text NOT NULL,
  "reason_code" text,
  "comment" text,
  "resume_at" timestamp with time zone,
  "target_funding_call_id" uuid,
  "previous_stage_status" text NOT NULL,
  "status" text DEFAULT 'ACTIVE' NOT NULL,
  "deferred_by" uuid NOT NULL,
  "deferred_at" timestamp with time zone DEFAULT now() NOT NULL,
  "resumed_by" uuid,
  "resumed_at" timestamp with time zone,
  "resume_action_execution_id" uuid,
  CONSTRAINT "app_workflow_deferrals_mode_check"
    CHECK ("mode" in ('DATE', 'FUNDING_CALL')),
  CONSTRAINT "app_workflow_deferrals_status_check"
    CHECK ("status" in ('ACTIVE', 'RESUMED', 'TRANSFERRED')),
  CONSTRAINT "app_workflow_deferrals_reason_check"
    CHECK ("reason_code" is not null OR length(btrim(coalesce("comment", ''))) > 0),
  CONSTRAINT "app_workflow_deferrals_target_check" CHECK (
    ("mode" = 'DATE' AND "continuation" = 'RESUME_ON_DATE'
      AND "resume_at" is not null AND "target_funding_call_id" is null)
    OR ("mode" = 'FUNDING_CALL' AND "continuation" = 'EXPLICIT_TRANSFER'
      AND "resume_at" is null AND "target_funding_call_id" is not null)
  )
);
--> statement-breakpoint
CREATE TABLE "app_workflow_escalations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "action_execution_id" uuid NOT NULL,
  "workflow_instance_id" uuid NOT NULL,
  "stage_instance_id" uuid NOT NULL,
  "task_id" uuid NOT NULL,
  "trigger" text NOT NULL,
  "target_type" text NOT NULL,
  "target_role_id" uuid,
  "target_user_id" uuid,
  "responsibility" text NOT NULL,
  "block_until_resolved" boolean NOT NULL,
  "source_assigned_role_id" uuid,
  "source_assigned_user_id" uuid,
  "reason_code" text,
  "comment" text,
  "status" text DEFAULT 'ACTIVE' NOT NULL,
  "escalated_by" uuid NOT NULL,
  "escalated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "resolved_by" uuid,
  "resolved_at" timestamp with time zone,
  "resolution_action_execution_id" uuid,
  CONSTRAINT "app_workflow_escalations_trigger_check"
    CHECK ("trigger" in ('MANUAL', 'SLA_BREACH', 'CONDITION')),
  CONSTRAINT "app_workflow_escalations_responsibility_check"
    CHECK ("responsibility" in ('RETAIN', 'SHARE', 'TRANSFER')),
  CONSTRAINT "app_workflow_escalations_status_check"
    CHECK ("status" in ('ACTIVE', 'RESOLVED')),
  CONSTRAINT "app_workflow_escalations_target_check" CHECK (
    ("target_type" = 'ROLE' AND "target_role_id" is not null
      AND "target_user_id" is null)
    OR ("target_type" = 'USER' AND "target_user_id" is not null
      AND "target_role_id" is null)
  ),
  CONSTRAINT "app_workflow_escalations_reason_check"
    CHECK ("reason_code" is not null OR length(btrim(coalesce("comment", ''))) > 0)
);
--> statement-breakpoint
ALTER TABLE "app_workflow_deferrals" ADD CONSTRAINT "app_workflow_deferrals_action_execution_id_fk" FOREIGN KEY ("action_execution_id") REFERENCES "app_workflow_action_executions"("id") ON DELETE restrict;
ALTER TABLE "app_workflow_deferrals" ADD CONSTRAINT "app_workflow_deferrals_workflow_instance_id_fk" FOREIGN KEY ("workflow_instance_id") REFERENCES "app_workflow_instances"("id") ON DELETE restrict;
ALTER TABLE "app_workflow_deferrals" ADD CONSTRAINT "app_workflow_deferrals_stage_instance_id_fk" FOREIGN KEY ("stage_instance_id") REFERENCES "app_workflow_stage_instances"("id") ON DELETE restrict;
ALTER TABLE "app_workflow_deferrals" ADD CONSTRAINT "app_workflow_deferrals_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "app_workflow_tasks"("id") ON DELETE restrict;
ALTER TABLE "app_workflow_deferrals" ADD CONSTRAINT "app_workflow_deferrals_target_funding_call_id_fk" FOREIGN KEY ("target_funding_call_id") REFERENCES "app_funding_calls"("id") ON DELETE restrict;
ALTER TABLE "app_workflow_deferrals" ADD CONSTRAINT "app_workflow_deferrals_deferred_by_fk" FOREIGN KEY ("deferred_by") REFERENCES "app_users"("id") ON DELETE restrict;
ALTER TABLE "app_workflow_deferrals" ADD CONSTRAINT "app_workflow_deferrals_resumed_by_fk" FOREIGN KEY ("resumed_by") REFERENCES "app_users"("id") ON DELETE restrict;
ALTER TABLE "app_workflow_deferrals" ADD CONSTRAINT "app_workflow_deferrals_resume_action_execution_id_fk" FOREIGN KEY ("resume_action_execution_id") REFERENCES "app_workflow_action_executions"("id") ON DELETE restrict;
ALTER TABLE "app_workflow_escalations" ADD CONSTRAINT "app_workflow_escalations_action_execution_id_fk" FOREIGN KEY ("action_execution_id") REFERENCES "app_workflow_action_executions"("id") ON DELETE restrict;
ALTER TABLE "app_workflow_escalations" ADD CONSTRAINT "app_workflow_escalations_workflow_instance_id_fk" FOREIGN KEY ("workflow_instance_id") REFERENCES "app_workflow_instances"("id") ON DELETE restrict;
ALTER TABLE "app_workflow_escalations" ADD CONSTRAINT "app_workflow_escalations_stage_instance_id_fk" FOREIGN KEY ("stage_instance_id") REFERENCES "app_workflow_stage_instances"("id") ON DELETE restrict;
ALTER TABLE "app_workflow_escalations" ADD CONSTRAINT "app_workflow_escalations_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "app_workflow_tasks"("id") ON DELETE restrict;
ALTER TABLE "app_workflow_escalations" ADD CONSTRAINT "app_workflow_escalations_target_role_id_fk" FOREIGN KEY ("target_role_id") REFERENCES "app_roles"("id") ON DELETE restrict;
ALTER TABLE "app_workflow_escalations" ADD CONSTRAINT "app_workflow_escalations_target_user_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "app_users"("id") ON DELETE restrict;
ALTER TABLE "app_workflow_escalations" ADD CONSTRAINT "app_workflow_escalations_source_assigned_role_id_fk" FOREIGN KEY ("source_assigned_role_id") REFERENCES "app_roles"("id") ON DELETE restrict;
ALTER TABLE "app_workflow_escalations" ADD CONSTRAINT "app_workflow_escalations_source_assigned_user_id_fk" FOREIGN KEY ("source_assigned_user_id") REFERENCES "app_users"("id") ON DELETE restrict;
ALTER TABLE "app_workflow_escalations" ADD CONSTRAINT "app_workflow_escalations_escalated_by_fk" FOREIGN KEY ("escalated_by") REFERENCES "app_users"("id") ON DELETE restrict;
ALTER TABLE "app_workflow_escalations" ADD CONSTRAINT "app_workflow_escalations_resolved_by_fk" FOREIGN KEY ("resolved_by") REFERENCES "app_users"("id") ON DELETE restrict;
ALTER TABLE "app_workflow_escalations" ADD CONSTRAINT "app_workflow_escalations_resolution_action_execution_id_fk" FOREIGN KEY ("resolution_action_execution_id") REFERENCES "app_workflow_action_executions"("id") ON DELETE restrict;
--> statement-breakpoint
CREATE UNIQUE INDEX "app_workflow_deferrals_execution_unique" ON "app_workflow_deferrals" ("action_execution_id");
CREATE UNIQUE INDEX "app_workflow_deferrals_active_stage_unique" ON "app_workflow_deferrals" ("stage_instance_id") WHERE "status" = 'ACTIVE';
CREATE INDEX "app_workflow_deferrals_resume_idx" ON "app_workflow_deferrals" ("status", "resume_at");
CREATE UNIQUE INDEX "app_workflow_escalations_execution_unique" ON "app_workflow_escalations" ("action_execution_id");
CREATE UNIQUE INDEX "app_workflow_escalations_active_task_unique" ON "app_workflow_escalations" ("task_id") WHERE "status" = 'ACTIVE';
CREATE INDEX "app_workflow_escalations_runtime_idx" ON "app_workflow_escalations" ("workflow_instance_id", "status");
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
ALTER TABLE app_workflow_action_definitions DISABLE TRIGGER app_workflow_actions_immutable;
--> statement-breakpoint
UPDATE app_workflow_action_definitions
SET configuration = configuration || CASE configuration->>'targetType'
  WHEN 'DATE' THEN '{"continuation":"RESUME_ON_DATE"}'::jsonb
  ELSE '{"continuation":"EXPLICIT_TRANSFER"}'::jsonb
END
WHERE action_type = 'DEFER' AND NOT configuration ? 'continuation';
--> statement-breakpoint
UPDATE app_workflow_action_definitions
SET configuration = configuration || jsonb_build_object(
  'blockUntilResolved', COALESCE(
    (configuration->>'blockUntilResolved')::boolean,
    true
  ),
  'responsibility', COALESCE(configuration->>'responsibility', 'SHARE')
)
WHERE action_type = 'ESCALATE'
  AND (NOT configuration ? 'blockUntilResolved'
    OR NOT configuration ? 'responsibility');
--> statement-breakpoint
INSERT INTO app_workflow_action_definitions (
  stage_id, stable_key, label, action_type, enabled,
  reason_code_required, display_order, configuration
)
SELECT defer.stage_id, 'RESUME', 'Resume', 'RESUME', true, false,
  max(existing.display_order) + 1, '{"scope":"STAGE"}'::jsonb
FROM app_workflow_action_definitions defer
JOIN app_workflow_action_definitions existing ON existing.stage_id = defer.stage_id
WHERE defer.action_type = 'DEFER'
  AND NOT EXISTS (
    SELECT 1 FROM app_workflow_action_definitions resume
    WHERE resume.stage_id = defer.stage_id AND resume.stable_key = 'RESUME'
  )
GROUP BY defer.stage_id;
--> statement-breakpoint
INSERT INTO app_stage_task_action_bindings (
  stage_id, task_definition_id, action_key
)
SELECT binding.stage_id, binding.task_definition_id, 'RESUME'
FROM app_stage_task_action_bindings binding
JOIN app_workflow_action_definitions defer
  ON defer.stage_id = binding.stage_id
  AND defer.stable_key = binding.action_key
  AND defer.action_type = 'DEFER'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
ALTER TABLE app_workflow_action_definitions ENABLE TRIGGER app_workflow_actions_immutable;
