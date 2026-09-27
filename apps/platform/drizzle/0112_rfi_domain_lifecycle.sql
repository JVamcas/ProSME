ALTER TABLE "app_workflow_stage_document_requirements"
  ADD COLUMN "request_on_stage_activation" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE TABLE "app_workflow_rfis" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "application_id" uuid NOT NULL,
  "workflow_instance_id" uuid NOT NULL,
  "stage_instance_id" uuid NOT NULL,
  "task_id" uuid NOT NULL,
  "action_definition_id" uuid NOT NULL,
  "requester_id" uuid NOT NULL,
  "recipient_user_id" uuid NOT NULL,
  "initiation_type" text NOT NULL,
  "status" text DEFAULT 'OPEN' NOT NULL,
  "question" text NOT NULL,
  "instructions" text NOT NULL,
  "editable_field_paths" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "reminder_day_offsets" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "deadline_at" timestamp with time zone NOT NULL,
  "expiry_action" text NOT NULL,
  "continuation_behavior" text NOT NULL,
  "idempotency_key" text NOT NULL,
  "correlation_id" uuid NOT NULL,
  "row_version" integer DEFAULT 1 NOT NULL,
  "continuation_applied_at" timestamp with time zone,
  "responded_at" timestamp with time zone,
  "closed_at" timestamp with time zone,
  "expired_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "app_workflow_rfis_status_check"
    CHECK ("status" IN ('OPEN', 'RESPONDED', 'CLOSED', 'EXPIRED')),
  CONSTRAINT "app_workflow_rfis_initiation_check"
    CHECK ("initiation_type" IN ('MANUAL', 'STAGE_ACTIVATION')),
  CONSTRAINT "app_workflow_rfis_expiry_action_check"
    CHECK ("expiry_action" IN ('CLOSE_REQUEST', 'ESCALATE', 'RETURN')),
  CONSTRAINT "app_workflow_rfis_continuation_check"
    CHECK ("continuation_behavior" = 'RESUME_SOURCE_TASK'),
  CONSTRAINT "app_workflow_rfis_row_version_check" CHECK ("row_version" > 0),
  CONSTRAINT "app_workflow_rfis_fields_check"
    CHECK (jsonb_typeof("editable_field_paths") = 'array'),
  CONSTRAINT "app_workflow_rfis_reminders_check"
    CHECK (jsonb_typeof("reminder_day_offsets") = 'array'),
  CONSTRAINT "app_workflow_rfis_application_fk" FOREIGN KEY ("application_id")
    REFERENCES "public"."app_applications"("id") ON DELETE restrict,
  CONSTRAINT "app_workflow_rfis_workflow_fk" FOREIGN KEY ("workflow_instance_id")
    REFERENCES "public"."app_workflow_instances"("id") ON DELETE restrict,
  CONSTRAINT "app_workflow_rfis_stage_fk" FOREIGN KEY ("stage_instance_id")
    REFERENCES "public"."app_workflow_stage_instances"("id") ON DELETE restrict,
  CONSTRAINT "app_workflow_rfis_task_fk" FOREIGN KEY ("task_id")
    REFERENCES "public"."app_workflow_tasks"("id") ON DELETE restrict,
  CONSTRAINT "app_workflow_rfis_action_fk" FOREIGN KEY ("action_definition_id")
    REFERENCES "public"."app_workflow_action_definitions"("id") ON DELETE restrict,
  CONSTRAINT "app_workflow_rfis_requester_fk" FOREIGN KEY ("requester_id")
    REFERENCES "public"."app_users"("id") ON DELETE restrict,
  CONSTRAINT "app_workflow_rfis_recipient_fk" FOREIGN KEY ("recipient_user_id")
    REFERENCES "public"."app_users"("id") ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX "app_workflow_rfis_idempotency_unique"
  ON "app_workflow_rfis" ("idempotency_key");
CREATE UNIQUE INDEX "app_workflow_rfis_active_task_action_unique"
  ON "app_workflow_rfis" ("task_id", "action_definition_id")
  WHERE "status" = 'OPEN';
CREATE INDEX "app_workflow_rfis_application_status_idx"
  ON "app_workflow_rfis" ("application_id", "status", "created_at");
CREATE INDEX "app_workflow_rfis_task_status_idx"
  ON "app_workflow_rfis" ("task_id", "status");
CREATE INDEX "app_workflow_rfis_deadline_idx"
  ON "app_workflow_rfis" ("status", "deadline_at");
--> statement-breakpoint
CREATE TABLE "app_workflow_rfi_participants" (
  "rfi_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "participant_type" text NOT NULL,
  "added_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "app_workflow_rfi_participants_pk"
    PRIMARY KEY ("rfi_id", "user_id", "participant_type"),
  CONSTRAINT "app_workflow_rfi_participants_type_check"
    CHECK ("participant_type" IN ('RECIPIENT', 'REQUESTER')),
  CONSTRAINT "app_workflow_rfi_participants_rfi_fk" FOREIGN KEY ("rfi_id")
    REFERENCES "public"."app_workflow_rfis"("id") ON DELETE restrict,
  CONSTRAINT "app_workflow_rfi_participants_user_fk" FOREIGN KEY ("user_id")
    REFERENCES "public"."app_users"("id") ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE "app_workflow_rfi_document_requests" (
  "rfi_id" uuid NOT NULL,
  "requirement_id" uuid NOT NULL,
  CONSTRAINT "app_workflow_rfi_document_requests_pk"
    PRIMARY KEY ("rfi_id", "requirement_id"),
  CONSTRAINT "app_workflow_rfi_document_requests_rfi_fk" FOREIGN KEY ("rfi_id")
    REFERENCES "public"."app_workflow_rfis"("id") ON DELETE restrict,
  CONSTRAINT "app_workflow_rfi_document_requests_requirement_fk"
    FOREIGN KEY ("requirement_id")
    REFERENCES "public"."app_workflow_stage_document_requirements"("id")
    ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE "app_workflow_rfi_responses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "rfi_id" uuid NOT NULL,
  "respondent_user_id" uuid NOT NULL,
  "field_values" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "idempotency_key" text NOT NULL,
  "correlation_id" uuid NOT NULL,
  "responded_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "app_workflow_rfi_responses_values_check"
    CHECK (jsonb_typeof("field_values") = 'object'),
  CONSTRAINT "app_workflow_rfi_responses_rfi_fk" FOREIGN KEY ("rfi_id")
    REFERENCES "public"."app_workflow_rfis"("id") ON DELETE restrict,
  CONSTRAINT "app_workflow_rfi_responses_user_fk" FOREIGN KEY ("respondent_user_id")
    REFERENCES "public"."app_users"("id") ON DELETE restrict
);
CREATE UNIQUE INDEX "app_workflow_rfi_responses_rfi_unique"
  ON "app_workflow_rfi_responses" ("rfi_id");
CREATE UNIQUE INDEX "app_workflow_rfi_responses_idempotency_unique"
  ON "app_workflow_rfi_responses" ("idempotency_key");
--> statement-breakpoint
CREATE TABLE "app_workflow_rfi_response_documents" (
  "response_id" uuid NOT NULL,
  "evidence_version_id" uuid NOT NULL,
  CONSTRAINT "app_workflow_rfi_response_documents_pk"
    PRIMARY KEY ("response_id", "evidence_version_id"),
  CONSTRAINT "app_workflow_rfi_response_documents_response_fk"
    FOREIGN KEY ("response_id") REFERENCES "public"."app_workflow_rfi_responses"("id")
    ON DELETE restrict,
  CONSTRAINT "app_workflow_rfi_response_documents_evidence_fk"
    FOREIGN KEY ("evidence_version_id")
    REFERENCES "public"."app_workflow_document_evidence_versions"("id")
    ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE "app_workflow_rfi_lifecycle_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "rfi_id" uuid NOT NULL,
  "from_status" text,
  "to_status" text NOT NULL,
  "actor_id" uuid,
  "actor_type" text NOT NULL,
  "correlation_id" uuid NOT NULL,
  "details" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "app_workflow_rfi_events_actor_check" CHECK (
    ("actor_type" = 'USER' AND "actor_id" IS NOT NULL)
    OR ("actor_type" = 'SYSTEM' AND "actor_id" IS NULL)
  ),
  CONSTRAINT "app_workflow_rfi_events_rfi_fk" FOREIGN KEY ("rfi_id")
    REFERENCES "public"."app_workflow_rfis"("id") ON DELETE restrict,
  CONSTRAINT "app_workflow_rfi_events_actor_fk" FOREIGN KEY ("actor_id")
    REFERENCES "public"."app_users"("id") ON DELETE restrict
);
CREATE INDEX "app_workflow_rfi_events_history_idx"
  ON "app_workflow_rfi_lifecycle_events" ("rfi_id", "occurred_at", "id");
--> statement-breakpoint
CREATE FUNCTION app_validate_workflow_rfi_transition()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status <> OLD.status AND NOT (
    (OLD.status = 'OPEN' AND NEW.status IN ('RESPONDED', 'CLOSED', 'EXPIRED'))
    OR (OLD.status = 'RESPONDED' AND NEW.status = 'CLOSED')
  ) THEN
    RAISE EXCEPTION 'invalid RFI transition from % to %', OLD.status, NEW.status;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER app_workflow_rfis_transition_guard
BEFORE UPDATE ON "app_workflow_rfis"
FOR EACH ROW EXECUTE FUNCTION app_validate_workflow_rfi_transition();
--> statement-breakpoint
CREATE FUNCTION app_prevent_workflow_rfi_response_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'RFI responses are immutable';
END;
$$;
CREATE TRIGGER app_workflow_rfi_responses_immutable
BEFORE UPDATE OR DELETE ON "app_workflow_rfi_responses"
FOR EACH ROW EXECUTE FUNCTION app_prevent_workflow_rfi_response_mutation();
CREATE TRIGGER app_workflow_rfi_response_documents_immutable
BEFORE UPDATE OR DELETE ON "app_workflow_rfi_response_documents"
FOR EACH ROW EXECUTE FUNCTION app_prevent_workflow_rfi_response_mutation();
