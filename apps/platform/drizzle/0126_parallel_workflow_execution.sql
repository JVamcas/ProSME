CREATE TABLE "app_workflow_transition_targets" (
  "transition_id" uuid NOT NULL,
  "target_stage_id" uuid NOT NULL,
  CONSTRAINT "app_workflow_transition_targets_transition_id_target_stage_id_pk"
    PRIMARY KEY ("transition_id", "target_stage_id"),
  CONSTRAINT "app_workflow_transition_targets_transition_fk"
    FOREIGN KEY ("transition_id")
    REFERENCES "app_workflow_transition_definitions"("id") ON DELETE restrict,
  CONSTRAINT "app_workflow_transition_targets_stage_fk"
    FOREIGN KEY ("target_stage_id")
    REFERENCES "app_workflow_stage_definitions"("id") ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX "app_workflow_transition_targets_stage_idx"
  ON "app_workflow_transition_targets" ("target_stage_id");
--> statement-breakpoint
INSERT INTO "app_workflow_transition_targets" (
  "transition_id",
  "target_stage_id"
)
SELECT "id", "to_stage_id"
FROM "app_workflow_transition_definitions"
WHERE "to_stage_id" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "app_workflow_transition_definitions"
  DROP COLUMN "to_stage_id";
--> statement-breakpoint
CREATE TABLE "app_workflow_stage_join_predecessors" (
  "stage_id" uuid NOT NULL,
  "predecessor_stage_id" uuid NOT NULL,
  CONSTRAINT "app_workflow_stage_join_predecessors_stage_id_predecessor_stage_id_pk"
    PRIMARY KEY ("stage_id", "predecessor_stage_id"),
  CONSTRAINT "app_workflow_stage_join_predecessors_stage_fk"
    FOREIGN KEY ("stage_id")
    REFERENCES "app_workflow_stage_definitions"("id") ON DELETE restrict,
  CONSTRAINT "app_workflow_stage_join_predecessors_predecessor_fk"
    FOREIGN KEY ("predecessor_stage_id")
    REFERENCES "app_workflow_stage_definitions"("id") ON DELETE restrict,
  CONSTRAINT "app_workflow_stage_join_predecessors_distinct_check"
    CHECK ("stage_id" <> "predecessor_stage_id")
);
--> statement-breakpoint
CREATE INDEX "app_workflow_stage_join_predecessors_predecessor_idx"
  ON "app_workflow_stage_join_predecessors" ("predecessor_stage_id");
--> statement-breakpoint
CREATE TABLE "app_workflow_transition_execution_targets" (
  "execution_id" uuid NOT NULL,
  "target_stage_definition_id" uuid NOT NULL,
  "target_stage_instance_id" uuid,
  "outcome" text NOT NULL,
  CONSTRAINT "app_workflow_transition_execution_targets_execution_fk"
    FOREIGN KEY ("execution_id")
    REFERENCES "app_workflow_transition_executions"("id") ON DELETE restrict,
  CONSTRAINT "app_workflow_transition_execution_targets_definition_fk"
    FOREIGN KEY ("target_stage_definition_id")
    REFERENCES "app_workflow_stage_definitions"("id") ON DELETE restrict,
  CONSTRAINT "app_workflow_transition_execution_targets_instance_fk"
    FOREIGN KEY ("target_stage_instance_id")
    REFERENCES "app_workflow_stage_instances"("id") ON DELETE restrict,
  CONSTRAINT "app_workflow_transition_execution_targets_outcome_check"
    CHECK ("outcome" IN (
      'ACTIVATED',
      'ALREADY_ACTIVE',
      'ENTRY_CONDITION_FAILED',
      'JOIN_PENDING'
    ))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "app_workflow_transition_execution_targets_unique"
  ON "app_workflow_transition_execution_targets" (
    "execution_id",
    "target_stage_definition_id"
  );
--> statement-breakpoint
CREATE INDEX "app_workflow_transition_execution_targets_stage_idx"
  ON "app_workflow_transition_execution_targets" (
    "target_stage_definition_id"
  );
--> statement-breakpoint
INSERT INTO "app_workflow_transition_execution_targets" (
  "execution_id",
  "target_stage_definition_id",
  "target_stage_instance_id",
  "outcome"
)
SELECT
  "id",
  "target_stage_definition_id",
  "target_stage_instance_id",
  CASE
    WHEN "target_stage_instance_id" IS NOT NULL THEN 'ACTIVATED'
    ELSE 'ENTRY_CONDITION_FAILED'
  END
FROM "app_workflow_transition_executions"
WHERE "target_stage_definition_id" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "app_workflow_transition_executions"
  DROP COLUMN "target_stage_definition_id";
--> statement-breakpoint
ALTER TABLE "app_workflow_transition_executions"
  DROP COLUMN "target_stage_instance_id";
--> statement-breakpoint
ALTER TABLE "app_workflow_transition_executions"
  DROP CONSTRAINT "app_workflow_transition_executions_outcome_check";
--> statement-breakpoint
ALTER TABLE "app_workflow_transition_executions"
  ADD CONSTRAINT "app_workflow_transition_executions_outcome_check"
  CHECK ("outcome" IN (
    'RECORDED',
    'TARGET_ACTIVATED',
    'TARGET_ENTRY_CONDITION_FAILED',
    'TARGET_JOIN_PENDING',
    'WORKFLOW_COMPLETED',
    'WORKFLOW_REJECTED'
  ));
--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_immutable_workflow_parallel_definition_mutation()
RETURNS trigger AS $$
DECLARE
  old_version_id uuid;
  new_version_id uuid;
  referenced_version_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'app_workflow_transition_targets' THEN
    IF TG_OP <> 'INSERT' THEN
      SELECT version_id INTO old_version_id
      FROM app_workflow_transition_definitions
      WHERE id = OLD.transition_id;
    END IF;
    IF TG_OP <> 'DELETE' THEN
      SELECT version_id INTO new_version_id
      FROM app_workflow_transition_definitions
      WHERE id = NEW.transition_id;
      SELECT version_id INTO referenced_version_id
      FROM app_workflow_stage_definitions
      WHERE id = NEW.target_stage_id;
    END IF;
  ELSE
    IF TG_OP <> 'INSERT' THEN
      SELECT version_id INTO old_version_id
      FROM app_workflow_stage_definitions
      WHERE id = OLD.stage_id;
    END IF;
    IF TG_OP <> 'DELETE' THEN
      SELECT version_id INTO new_version_id
      FROM app_workflow_stage_definitions
      WHERE id = NEW.stage_id;
      SELECT version_id INTO referenced_version_id
      FROM app_workflow_stage_definitions
      WHERE id = NEW.predecessor_stage_id;
    END IF;
  END IF;

  IF TG_OP <> 'INSERT' THEN
    PERFORM require_mutable_workflow_version(old_version_id);
  END IF;
  IF TG_OP <> 'DELETE' THEN
    IF new_version_id IS DISTINCT FROM referenced_version_id THEN
      RAISE EXCEPTION 'parallel workflow references must belong to one version';
    END IF;
    PERFORM require_mutable_workflow_version(new_version_id);
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER app_workflow_transition_targets_immutable
BEFORE INSERT OR UPDATE OR DELETE ON "app_workflow_transition_targets"
FOR EACH ROW
EXECUTE FUNCTION prevent_immutable_workflow_parallel_definition_mutation();
--> statement-breakpoint
CREATE TRIGGER app_workflow_stage_join_predecessors_immutable
BEFORE INSERT OR UPDATE OR DELETE ON "app_workflow_stage_join_predecessors"
FOR EACH ROW
EXECUTE FUNCTION prevent_immutable_workflow_parallel_definition_mutation();
