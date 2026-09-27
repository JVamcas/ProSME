ALTER TABLE "app_workflow_rfi_correspondence"
  ADD COLUMN "conversation_sequence" bigint GENERATED ALWAYS AS IDENTITY;
--> statement-breakpoint
DROP INDEX "app_workflow_rfi_correspondence_history_idx";
CREATE UNIQUE INDEX "app_workflow_rfi_correspondence_sequence_unique"
  ON "app_workflow_rfi_correspondence" ("rfi_id", "conversation_sequence");
CREATE INDEX "app_workflow_rfi_correspondence_history_idx"
  ON "app_workflow_rfi_correspondence" ("rfi_id", "conversation_sequence");
--> statement-breakpoint
ALTER TABLE "app_workflow_rfi_lifecycle_events"
  ADD COLUMN "application_id" uuid,
  ADD COLUMN "workflow_instance_id" uuid,
  ADD COLUMN "stage_instance_id" uuid,
  ADD COLUMN "task_id" uuid,
  ADD COLUMN "action_definition_id" uuid,
  ADD COLUMN "lifecycle_sequence" bigint GENERATED ALWAYS AS IDENTITY;
UPDATE "app_workflow_rfi_lifecycle_events" AS lifecycle
SET "application_id" = rfi."application_id",
    "workflow_instance_id" = rfi."workflow_instance_id",
    "stage_instance_id" = rfi."stage_instance_id",
    "task_id" = rfi."task_id",
    "action_definition_id" = rfi."action_definition_id"
FROM "app_workflow_rfis" AS rfi
WHERE rfi."id" = lifecycle."rfi_id";
ALTER TABLE "app_workflow_rfi_lifecycle_events"
  ALTER COLUMN "application_id" SET NOT NULL,
  ALTER COLUMN "workflow_instance_id" SET NOT NULL,
  ALTER COLUMN "stage_instance_id" SET NOT NULL,
  ALTER COLUMN "task_id" SET NOT NULL,
  ALTER COLUMN "action_definition_id" SET NOT NULL,
  ADD CONSTRAINT "app_workflow_rfi_events_application_fk"
    FOREIGN KEY ("application_id") REFERENCES "public"."app_applications"("id")
    ON DELETE restrict,
  ADD CONSTRAINT "app_workflow_rfi_events_workflow_fk"
    FOREIGN KEY ("workflow_instance_id")
    REFERENCES "public"."app_workflow_instances"("id") ON DELETE restrict,
  ADD CONSTRAINT "app_workflow_rfi_events_stage_fk"
    FOREIGN KEY ("stage_instance_id")
    REFERENCES "public"."app_workflow_stage_instances"("id") ON DELETE restrict,
  ADD CONSTRAINT "app_workflow_rfi_events_task_fk"
    FOREIGN KEY ("task_id") REFERENCES "public"."app_workflow_tasks"("id")
    ON DELETE restrict,
  ADD CONSTRAINT "app_workflow_rfi_events_action_fk"
    FOREIGN KEY ("action_definition_id")
    REFERENCES "public"."app_workflow_action_definitions"("id")
    ON DELETE restrict,
  ADD CONSTRAINT "app_workflow_rfi_events_status_check" CHECK (
    ("from_status" IS NULL AND "to_status" = 'OPEN')
    OR ("from_status" = 'OPEN' AND "to_status" IN ('RESPONDED', 'CLOSED', 'EXPIRED'))
    OR ("from_status" = 'RESPONDED' AND "to_status" = 'CLOSED')
  );
DROP INDEX "app_workflow_rfi_events_history_idx";
CREATE UNIQUE INDEX "app_workflow_rfi_events_sequence_unique"
  ON "app_workflow_rfi_lifecycle_events" ("rfi_id", "lifecycle_sequence");
CREATE INDEX "app_workflow_rfi_events_history_idx"
  ON "app_workflow_rfi_lifecycle_events" ("rfi_id", "lifecycle_sequence");
--> statement-breakpoint
CREATE FUNCTION app_prevent_workflow_rfi_lifecycle_event_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'RFI lifecycle events are immutable';
END;
$$;
CREATE TRIGGER app_workflow_rfi_lifecycle_events_immutable
BEFORE UPDATE OR DELETE ON "app_workflow_rfi_lifecycle_events"
FOR EACH ROW EXECUTE FUNCTION app_prevent_workflow_rfi_lifecycle_event_mutation();
