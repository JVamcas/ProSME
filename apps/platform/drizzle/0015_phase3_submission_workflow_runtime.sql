CREATE SEQUENCE "app_application_reference_seq";
--> statement-breakpoint
ALTER TABLE "app_applications"
  DROP CONSTRAINT "app_applications_status_check";
--> statement-breakpoint
ALTER TABLE "app_applications"
  ADD COLUMN "reference" text,
  ADD COLUMN "workflow_version_id" uuid,
  ADD COLUMN "submitted_at" timestamp with time zone,
  ADD CONSTRAINT "app_applications_status_check"
    CHECK ("status" IN ('draft', 'submitted')),
  ADD CONSTRAINT "app_applications_submission_fields_check"
    CHECK (
      ("status" = 'draft' AND "reference" IS NULL
        AND "workflow_version_id" IS NULL AND "submitted_at" IS NULL)
      OR
      ("status" = 'submitted' AND "reference" IS NOT NULL
        AND "workflow_version_id" IS NOT NULL AND "submitted_at" IS NOT NULL)
    ),
  ADD CONSTRAINT "app_applications_workflow_version_fk"
    FOREIGN KEY ("workflow_version_id")
    REFERENCES "app_workflow_definition_versions"("id") ON DELETE restrict;
--> statement-breakpoint
CREATE UNIQUE INDEX "app_applications_reference_unique"
  ON "app_applications" ("reference");
--> statement-breakpoint
CREATE TABLE "app_workflow_instances" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "application_id" uuid NOT NULL,
  "workflow_version_id" uuid NOT NULL,
  "status" text DEFAULT 'ACTIVE' NOT NULL,
  "current_stage_instance_id" uuid,
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "ended_at" timestamp with time zone,
  CONSTRAINT "app_workflow_instances_status_check"
    CHECK ("status" IN ('ACTIVE', 'COMPLETED', 'CANCELLED')),
  CONSTRAINT "app_workflow_instances_application_fk"
    FOREIGN KEY ("application_id") REFERENCES "app_applications"("id")
    ON DELETE restrict,
  CONSTRAINT "app_workflow_instances_version_fk"
    FOREIGN KEY ("workflow_version_id")
    REFERENCES "app_workflow_definition_versions"("id") ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX "app_workflow_instances_application_unique"
  ON "app_workflow_instances" ("application_id");
--> statement-breakpoint
CREATE INDEX "app_workflow_instances_version_idx"
  ON "app_workflow_instances" ("workflow_version_id");
--> statement-breakpoint
CREATE TABLE "app_workflow_stage_instances" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workflow_instance_id" uuid NOT NULL,
  "stage_definition_id" uuid NOT NULL,
  "status" text DEFAULT 'ACTIVE' NOT NULL,
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "ended_at" timestamp with time zone,
  CONSTRAINT "app_workflow_stage_instances_status_check"
    CHECK ("status" IN ('NOT_STARTED', 'ACTIVE', 'BLOCKED', 'COMPLETED', 'CANCELLED')),
  CONSTRAINT "app_workflow_stage_instances_workflow_fk"
    FOREIGN KEY ("workflow_instance_id") REFERENCES "app_workflow_instances"("id")
    ON DELETE restrict,
  CONSTRAINT "app_workflow_stage_instances_definition_fk"
    FOREIGN KEY ("stage_definition_id")
    REFERENCES "app_workflow_stage_definitions"("id") ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX "app_workflow_stage_instances_definition_unique"
  ON "app_workflow_stage_instances" ("workflow_instance_id", "stage_definition_id");
--> statement-breakpoint
ALTER TABLE "app_workflow_instances"
  ADD CONSTRAINT "app_workflow_instances_current_stage_fk"
  FOREIGN KEY ("current_stage_instance_id")
  REFERENCES "app_workflow_stage_instances"("id") ON DELETE restrict;
--> statement-breakpoint
CREATE TABLE "app_stage_task_instances" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "stage_instance_id" uuid NOT NULL,
  "task_definition_id" uuid NOT NULL,
  "type_snapshot" text NOT NULL,
  "status" text DEFAULT 'READY' NOT NULL,
  "assignment_role_id" uuid,
  "assignment_user_id" uuid,
  "due_at" timestamp with time zone,
  "result" jsonb,
  "row_version" integer DEFAULT 1 NOT NULL,
  "started_at" timestamp with time zone,
  "ended_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "app_stage_task_instances_status_check"
    CHECK ("status" IN (
      'PENDING', 'READY', 'CLAIMED', 'IN_PROGRESS', 'BLOCKED',
      'COMPLETED', 'SKIPPED', 'CANCELLED'
    )),
  CONSTRAINT "app_stage_task_instances_row_version_check"
    CHECK ("row_version" > 0),
  CONSTRAINT "app_stage_task_instances_assignment_check"
    CHECK ("assignment_role_id" IS NULL OR "assignment_user_id" IS NULL),
  CONSTRAINT "app_stage_task_instances_stage_fk"
    FOREIGN KEY ("stage_instance_id")
    REFERENCES "app_workflow_stage_instances"("id") ON DELETE restrict,
  CONSTRAINT "app_stage_task_instances_definition_fk"
    FOREIGN KEY ("task_definition_id")
    REFERENCES "app_stage_task_definitions"("id") ON DELETE restrict,
  CONSTRAINT "app_stage_task_instances_role_fk"
    FOREIGN KEY ("assignment_role_id") REFERENCES "app_roles"("id")
    ON DELETE restrict,
  CONSTRAINT "app_stage_task_instances_user_fk"
    FOREIGN KEY ("assignment_user_id") REFERENCES "app_users"("id")
    ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX "app_stage_task_instances_definition_unique"
  ON "app_stage_task_instances" ("stage_instance_id", "task_definition_id");
--> statement-breakpoint
CREATE INDEX "app_stage_task_instances_assignment_idx"
  ON "app_stage_task_instances" ("status", "assignment_role_id", "assignment_user_id");
--> statement-breakpoint
CREATE TABLE "app_workflow_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workflow_instance_id" uuid NOT NULL,
  "event_code" text NOT NULL,
  "actor_id" uuid NOT NULL,
  "correlation_id" uuid NOT NULL,
  "payload" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "app_workflow_events_workflow_fk"
    FOREIGN KEY ("workflow_instance_id") REFERENCES "app_workflow_instances"("id")
    ON DELETE restrict,
  CONSTRAINT "app_workflow_events_actor_fk"
    FOREIGN KEY ("actor_id") REFERENCES "app_users"("id") ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX "app_workflow_events_instance_idx"
  ON "app_workflow_events" ("workflow_instance_id", "created_at");
--> statement-breakpoint
CREATE TABLE "app_transactional_outbox" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_code" text NOT NULL,
  "aggregate_id" uuid NOT NULL,
  "schema_version" integer NOT NULL,
  "payload" jsonb NOT NULL,
  "correlation_id" uuid NOT NULL,
  "status" text DEFAULT 'PENDING' NOT NULL,
  "attempt_count" integer DEFAULT 0 NOT NULL,
  "available_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "processed_at" timestamp with time zone,
  CONSTRAINT "app_transactional_outbox_schema_version_check"
    CHECK ("schema_version" > 0),
  CONSTRAINT "app_transactional_outbox_attempt_count_check"
    CHECK ("attempt_count" >= 0),
  CONSTRAINT "app_transactional_outbox_status_check"
    CHECK ("status" IN ('PENDING', 'PROCESSING', 'DELIVERED', 'FAILED', 'CANCELLED'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "app_transactional_outbox_event_aggregate_unique"
  ON "app_transactional_outbox" ("event_code", "aggregate_id");
--> statement-breakpoint
CREATE INDEX "app_transactional_outbox_pending_idx"
  ON "app_transactional_outbox" ("status", "available_at");
--> statement-breakpoint
CREATE TABLE "app_application_submission_commands" (
  "application_id" uuid PRIMARY KEY NOT NULL,
  "idempotency_key" text NOT NULL,
  "reference" text NOT NULL,
  "workflow_instance_id" uuid NOT NULL,
  "submitted_at" timestamp with time zone NOT NULL,
  CONSTRAINT "app_submission_commands_application_fk"
    FOREIGN KEY ("application_id") REFERENCES "app_applications"("id")
    ON DELETE restrict,
  CONSTRAINT "app_submission_commands_workflow_fk"
    FOREIGN KEY ("workflow_instance_id") REFERENCES "app_workflow_instances"("id")
    ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX "app_submission_commands_key_unique"
  ON "app_application_submission_commands" ("idempotency_key");
--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_submitted_application_identity_change()
RETURNS trigger AS $$
BEGIN
  IF OLD."reference" IS NOT NULL AND (
    NEW."reference" IS DISTINCT FROM OLD."reference"
    OR NEW."workflow_version_id" IS DISTINCT FROM OLD."workflow_version_id"
    OR NEW."submitted_at" IS DISTINCT FROM OLD."submitted_at"
    OR NEW."status" IS DISTINCT FROM OLD."status"
  ) THEN
    RAISE EXCEPTION 'submitted application identity is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER app_applications_submission_identity_immutable
BEFORE UPDATE ON "app_applications"
FOR EACH ROW EXECUTE FUNCTION prevent_submitted_application_identity_change();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_workflow_event_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'workflow events are immutable';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER app_workflow_events_immutable
BEFORE UPDATE OR DELETE ON "app_workflow_events"
FOR EACH ROW EXECUTE FUNCTION prevent_workflow_event_mutation();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_workflow_instance_repinning()
RETURNS trigger AS $$
BEGIN
  IF NEW."application_id" IS DISTINCT FROM OLD."application_id"
    OR NEW."workflow_version_id" IS DISTINCT FROM OLD."workflow_version_id"
    OR NEW."started_at" IS DISTINCT FROM OLD."started_at"
  THEN
    RAISE EXCEPTION 'workflow instance version pin is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER app_workflow_instances_version_pin_immutable
BEFORE UPDATE ON "app_workflow_instances"
FOR EACH ROW EXECUTE FUNCTION prevent_workflow_instance_repinning();
