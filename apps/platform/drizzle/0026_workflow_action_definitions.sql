CREATE TABLE "app_workflow_action_definitions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "stage_id" uuid NOT NULL,
  "stable_key" text NOT NULL,
  "label" text NOT NULL,
  "action_type" text NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "reason_code_required" boolean DEFAULT false NOT NULL,
  "display_order" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app_workflow_action_definitions"
  ADD CONSTRAINT "app_workflow_action_definitions_stage_id_app_workflow_stage_definitions_id_fk"
  FOREIGN KEY ("stage_id") REFERENCES "public"."app_workflow_stage_definitions"("id")
  ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "app_workflow_actions_stage_key_unique"
  ON "app_workflow_action_definitions" USING btree ("stage_id", "stable_key");
--> statement-breakpoint
CREATE UNIQUE INDEX "app_workflow_actions_stage_order_unique"
  ON "app_workflow_action_definitions" USING btree ("stage_id", "display_order");
--> statement-breakpoint
ALTER TABLE "app_workflow_action_definitions"
  ADD CONSTRAINT "app_workflow_actions_stable_key_check"
    CHECK (stable_key ~ '^[A-Z][A-Z0-9_]*$'),
  ADD CONSTRAINT "app_workflow_actions_label_check"
    CHECK (length(btrim(label)) BETWEEN 2 AND 160),
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
      'DEFER'
    )),
  ADD CONSTRAINT "app_workflow_actions_display_order_check"
    CHECK (display_order > 0);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_immutable_workflow_child_mutation()
RETURNS trigger AS $$
DECLARE old_version_id uuid; new_version_id uuid;
BEGIN
  IF TG_TABLE_NAME IN (
    'app_stage_task_definitions',
    'app_workflow_action_definitions'
  ) THEN
    IF TG_OP <> 'INSERT' THEN
      SELECT version_id INTO old_version_id
      FROM app_workflow_stage_definitions
      WHERE id = OLD.stage_id;
    END IF;
    IF TG_OP <> 'DELETE' THEN
      SELECT version_id INTO new_version_id
      FROM app_workflow_stage_definitions
      WHERE id = NEW.stage_id;
    END IF;
  ELSE
    IF TG_OP <> 'INSERT' THEN old_version_id := OLD.version_id; END IF;
    IF TG_OP <> 'DELETE' THEN new_version_id := NEW.version_id; END IF;
  END IF;
  IF TG_OP <> 'INSERT' THEN
    PERFORM require_mutable_workflow_version(old_version_id);
  END IF;
  IF TG_OP <> 'DELETE' THEN
    PERFORM require_mutable_workflow_version(new_version_id);
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER app_workflow_actions_immutable
BEFORE INSERT OR UPDATE OR DELETE ON "app_workflow_action_definitions"
FOR EACH ROW EXECUTE FUNCTION prevent_immutable_workflow_child_mutation();
