CREATE TABLE "app_funding_opportunity_workflows" (
	"funding_opportunity_id" integer PRIMARY KEY NOT NULL,
	"funding_opportunity_title" text NOT NULL,
	"workflow_version_id" uuid NOT NULL,
	"assigned_by" uuid NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_stage_task_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stage_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"sequence" integer NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"assignment_role_id" uuid,
	"assignment_user_id" uuid,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_workflow_audit_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"correlation_id" uuid NOT NULL,
	"idempotency_key" text,
	"before" jsonb,
	"after" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_workflow_definition_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"definition_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"row_version" integer DEFAULT 1 NOT NULL,
	"created_by" uuid NOT NULL,
	"published_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"retired_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "app_workflow_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_workflow_stage_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"sequence" integer NOT NULL,
	"initial" boolean DEFAULT false NOT NULL,
	"applicant_status" text NOT NULL,
	"applicant_label" text NOT NULL,
	"applicant_description" text NOT NULL,
	"default_role_id" uuid,
	"sla_hours" integer
);
--> statement-breakpoint
CREATE TABLE "app_workflow_transition_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version_id" uuid NOT NULL,
	"from_stage_id" uuid NOT NULL,
	"action_code" text NOT NULL,
	"to_stage_id" uuid,
	"terminal_outcome" text,
	"required_capability" text NOT NULL,
	"condition" jsonb
);
--> statement-breakpoint
ALTER TABLE "app_funding_opportunity_workflows" ADD CONSTRAINT "app_funding_opportunity_workflows_workflow_version_id_app_workflow_definition_versions_id_fk" FOREIGN KEY ("workflow_version_id") REFERENCES "public"."app_workflow_definition_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_funding_opportunity_workflows" ADD CONSTRAINT "app_funding_opportunity_workflows_assigned_by_app_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."app_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_stage_task_definitions" ADD CONSTRAINT "app_stage_task_definitions_stage_id_app_workflow_stage_definitions_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."app_workflow_stage_definitions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_stage_task_definitions" ADD CONSTRAINT "app_stage_task_definitions_assignment_role_id_app_roles_id_fk" FOREIGN KEY ("assignment_role_id") REFERENCES "public"."app_roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_stage_task_definitions" ADD CONSTRAINT "app_stage_task_definitions_assignment_user_id_app_users_id_fk" FOREIGN KEY ("assignment_user_id") REFERENCES "public"."app_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_workflow_audit_entries" ADD CONSTRAINT "app_workflow_audit_entries_actor_id_app_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."app_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_workflow_definition_versions" ADD CONSTRAINT "app_workflow_definition_versions_definition_id_app_workflow_definitions_id_fk" FOREIGN KEY ("definition_id") REFERENCES "public"."app_workflow_definitions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_workflow_definition_versions" ADD CONSTRAINT "app_workflow_definition_versions_created_by_app_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_workflow_definition_versions" ADD CONSTRAINT "app_workflow_definition_versions_published_by_app_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."app_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_workflow_stage_definitions" ADD CONSTRAINT "app_workflow_stage_definitions_version_id_app_workflow_definition_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."app_workflow_definition_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_workflow_stage_definitions" ADD CONSTRAINT "app_workflow_stage_definitions_default_role_id_app_roles_id_fk" FOREIGN KEY ("default_role_id") REFERENCES "public"."app_roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_workflow_transition_definitions" ADD CONSTRAINT "app_workflow_transition_definitions_version_id_app_workflow_definition_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."app_workflow_definition_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_workflow_transition_definitions" ADD CONSTRAINT "app_workflow_transition_definitions_from_stage_id_app_workflow_stage_definitions_id_fk" FOREIGN KEY ("from_stage_id") REFERENCES "public"."app_workflow_stage_definitions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_workflow_transition_definitions" ADD CONSTRAINT "app_workflow_transition_definitions_to_stage_id_app_workflow_stage_definitions_id_fk" FOREIGN KEY ("to_stage_id") REFERENCES "public"."app_workflow_stage_definitions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "app_funding_workflow_version_idx" ON "app_funding_opportunity_workflows" USING btree ("workflow_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "app_stage_tasks_stage_code_unique" ON "app_stage_task_definitions" USING btree ("stage_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "app_stage_tasks_stage_sequence_unique" ON "app_stage_task_definitions" USING btree ("stage_id","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "app_workflow_audit_idempotency_unique" ON "app_workflow_audit_entries" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "app_workflow_audit_target_idx" ON "app_workflow_audit_entries" USING btree ("target_type","target_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "app_workflow_versions_definition_number_unique" ON "app_workflow_definition_versions" USING btree ("definition_id","version_number");--> statement-breakpoint
CREATE INDEX "app_workflow_versions_definition_status_idx" ON "app_workflow_definition_versions" USING btree ("definition_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "app_workflow_definitions_code_unique" ON "app_workflow_definitions" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "app_workflow_stages_version_code_unique" ON "app_workflow_stage_definitions" USING btree ("version_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "app_workflow_stages_version_sequence_unique" ON "app_workflow_stage_definitions" USING btree ("version_id","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "app_workflow_transitions_source_action_unique" ON "app_workflow_transition_definitions" USING btree ("version_id","from_stage_id","action_code");--> statement-breakpoint
CREATE INDEX "app_workflow_transitions_version_idx" ON "app_workflow_transition_definitions" USING btree ("version_id");
--> statement-breakpoint
ALTER TABLE "app_workflow_definition_versions"
  ADD CONSTRAINT "app_workflow_versions_number_check" CHECK ("version_number" > 0),
  ADD CONSTRAINT "app_workflow_versions_row_version_check" CHECK ("row_version" > 0),
  ADD CONSTRAINT "app_workflow_versions_status_check" CHECK ("status" IN ('DRAFT', 'PUBLISHED', 'RETIRED'));
--> statement-breakpoint
CREATE UNIQUE INDEX "app_workflow_versions_one_draft_unique"
  ON "app_workflow_definition_versions" ("definition_id") WHERE "status" = 'DRAFT';
--> statement-breakpoint
ALTER TABLE "app_workflow_stage_definitions"
  ADD CONSTRAINT "app_workflow_stages_sequence_check" CHECK ("sequence" > 0),
  ADD CONSTRAINT "app_workflow_stages_sla_check" CHECK ("sla_hours" IS NULL OR "sla_hours" > 0);
--> statement-breakpoint
ALTER TABLE "app_stage_task_definitions"
  ADD CONSTRAINT "app_stage_tasks_sequence_check" CHECK ("sequence" > 0),
  ADD CONSTRAINT "app_stage_tasks_assignment_check" CHECK ("assignment_role_id" IS NULL OR "assignment_user_id" IS NULL),
  ADD CONSTRAINT "app_stage_tasks_type_check" CHECK ("type" IN (
    'AUTOMATED_RULE_CHECK', 'CHECKLIST', 'DOCUMENT_REVIEW', 'STRUCTURED_FORM',
    'ASSESSMENT_FORM', 'FINANCE_REVIEW', 'INFORMATION_REQUEST',
    'RECOMMENDATION', 'DECISION', 'COMMUNICATION'
  ));
--> statement-breakpoint
ALTER TABLE "app_workflow_transition_definitions"
  ADD CONSTRAINT "app_workflow_transitions_target_check"
  CHECK (("to_stage_id" IS NOT NULL)::integer + ("terminal_outcome" IS NOT NULL)::integer = 1),
  ADD CONSTRAINT "app_workflow_transitions_action_check"
  CHECK ("action_code" IN (
    'CLAIM', 'ASSIGN', 'START', 'SAVE', 'COMPLETE', 'SKIP',
    'REQUEST_INFORMATION', 'ACCEPT_INFORMATION', 'RECOMMEND_PROCEED',
    'RECOMMEND_REJECT', 'APPROVE', 'DECLINE', 'RETURN', 'OVERRIDE', 'CANCEL'
  ));
--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_immutable_workflow_child_mutation()
RETURNS trigger AS $$
DECLARE parent_version_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'app_stage_task_definitions' THEN
    SELECT "version_id" INTO parent_version_id FROM "app_workflow_stage_definitions"
    WHERE "id" = CASE WHEN TG_OP = 'DELETE' THEN OLD."stage_id" ELSE NEW."stage_id" END;
  ELSE
    parent_version_id := CASE WHEN TG_OP = 'DELETE' THEN OLD."version_id" ELSE NEW."version_id" END;
  END IF;
  IF EXISTS (SELECT 1 FROM "app_workflow_definition_versions" WHERE "id" = parent_version_id AND "status" <> 'DRAFT') THEN
    RAISE EXCEPTION 'published and retired workflow versions are immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER app_workflow_stages_immutable
BEFORE INSERT OR UPDATE OR DELETE ON "app_workflow_stage_definitions"
FOR EACH ROW EXECUTE FUNCTION prevent_immutable_workflow_child_mutation();
--> statement-breakpoint
CREATE TRIGGER app_stage_tasks_immutable
BEFORE INSERT OR UPDATE OR DELETE ON "app_stage_task_definitions"
FOR EACH ROW EXECUTE FUNCTION prevent_immutable_workflow_child_mutation();
--> statement-breakpoint
CREATE TRIGGER app_workflow_transitions_immutable
BEFORE INSERT OR UPDATE OR DELETE ON "app_workflow_transition_definitions"
FOR EACH ROW EXECUTE FUNCTION prevent_immutable_workflow_child_mutation();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION protect_workflow_version_lifecycle()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD."status" <> 'DRAFT' THEN
    RAISE EXCEPTION 'published and retired workflow versions cannot be deleted';
  END IF;
  IF TG_OP = 'UPDATE' AND NOT (
    NEW."id" = OLD."id"
    AND NEW."definition_id" = OLD."definition_id"
    AND NEW."version_number" = OLD."version_number"
    AND NEW."created_by" = OLD."created_by"
    AND NEW."created_at" = OLD."created_at"
    AND NEW."row_version" = OLD."row_version" + 1
    AND (
      (
        OLD."status" = 'DRAFT' AND NEW."status" = 'DRAFT'
        AND NEW."published_by" IS NULL AND NEW."published_at" IS NULL
        AND NEW."retired_at" IS NULL
      ) OR (
        OLD."status" = 'DRAFT' AND NEW."status" = 'PUBLISHED'
        AND NEW."published_by" IS NOT NULL AND NEW."published_at" IS NOT NULL
        AND NEW."retired_at" IS NULL
      ) OR (
        OLD."status" = 'PUBLISHED' AND NEW."status" = 'RETIRED'
        AND NEW."published_by" IS NOT DISTINCT FROM OLD."published_by"
        AND NEW."published_at" IS NOT DISTINCT FROM OLD."published_at"
        AND NEW."retired_at" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM "app_funding_opportunity_workflows"
          WHERE "workflow_version_id" = OLD."id"
        )
      )
    )
  ) THEN
    RAISE EXCEPTION 'invalid workflow version lifecycle transition';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER app_workflow_versions_lifecycle
BEFORE UPDATE OR DELETE ON "app_workflow_definition_versions"
FOR EACH ROW EXECUTE FUNCTION protect_workflow_version_lifecycle();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION require_published_opportunity_workflow()
RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "app_workflow_definition_versions" WHERE "id" = NEW."workflow_version_id" AND "status" = 'PUBLISHED') THEN
    RAISE EXCEPTION 'funding opportunities require a published workflow version';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER app_funding_workflow_published_only
BEFORE INSERT OR UPDATE ON "app_funding_opportunity_workflows"
FOR EACH ROW EXECUTE FUNCTION require_published_opportunity_workflow();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_workflow_audit_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'workflow audit entries are immutable';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER app_workflow_audit_immutable
BEFORE UPDATE OR DELETE ON "app_workflow_audit_entries"
FOR EACH ROW EXECUTE FUNCTION prevent_workflow_audit_mutation();
--> statement-breakpoint
INSERT INTO "app_capabilities" ("code", "description") VALUES
  ('work_queue.read', 'Read the assigned work queue'),
  ('workflow.task.read', 'Read an assigned workflow task'),
  ('workflow.task.claim', 'Claim an eligible workflow task'),
  ('workflow.task.assign', 'Assign or reassign a workflow task'),
  ('workflow.task.complete', 'Complete a workflow task with task-specific authority'),
  ('application.screen', 'Complete screening tasks'),
  ('application.assess', 'Complete technical assessment tasks'),
  ('application.finance_review', 'Complete finance review tasks'),
  ('application.comment', 'Add internal application comments'),
  ('application.request_information', 'Request information from an applicant'),
  ('application.recommend', 'Record an application recommendation'),
  ('application.decide', 'Record an authorized application outcome'),
  ('application.override', 'Override a recommendation with a reason'),
  ('communication.read', 'Read operational communications'),
  ('communication.send', 'Send an application communication'),
  ('workflow.definition.read', 'Read workflow definitions'),
  ('workflow.definition.create', 'Create workflow definitions'),
  ('workflow.definition.update', 'Update workflow drafts and assignments'),
  ('workflow.definition.publish', 'Publish validated workflow versions'),
  ('workflow.definition.retire', 'Retire published workflow versions')
ON CONFLICT ("code") DO UPDATE SET "description" = EXCLUDED."description";
--> statement-breakpoint
INSERT INTO "app_role_capabilities" ("role_id", "capability_id")
SELECT role_row."id", capability_row."id"
FROM "app_roles" role_row
CROSS JOIN "app_capabilities" capability_row
WHERE
  (role_row."code" = 'system_administrator' AND capability_row."code" LIKE 'workflow.%')
  OR (role_row."code" IN ('programme_officer', 'approval_panel_member') AND capability_row."code" = 'workflow.definition.read')
ON CONFLICT ("role_id", "capability_id") DO NOTHING;
