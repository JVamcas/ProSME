CREATE TABLE "app_eligibility_input_definitions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "version_id" uuid NOT NULL
    REFERENCES "app_eligibility_rule_set_versions"("id") ON DELETE restrict,
  "stable_key" text NOT NULL,
  "label" text NOT NULL,
  "data_type" text NOT NULL,
  "available_in" text[] NOT NULL,
  "display_order" integer NOT NULL,
  "group_key" text,
  "group_label" text,
  "created_by" uuid NOT NULL REFERENCES "app_users"("id") ON DELETE restrict,
  "updated_by" uuid NOT NULL REFERENCES "app_users"("id") ON DELETE restrict,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "app_eligibility_inputs_key_check"
    CHECK ("stable_key" ~ '^[a-z][a-z0-9_]*$'),
  CONSTRAINT "app_eligibility_inputs_label_check"
    CHECK (length(btrim("label")) > 0),
  CONSTRAINT "app_eligibility_inputs_type_check"
    CHECK ("data_type" IN ('TEXT', 'NUMBER', 'BOOLEAN', 'DATE')),
  CONSTRAINT "app_eligibility_inputs_modes_check" CHECK (
    cardinality("available_in") BETWEEN 1 AND 2
    AND "available_in" <@ ARRAY['SELF_CHECK', 'SCREENING']::text[]
    AND (
      cardinality("available_in") = 1
      OR "available_in"[1] <> "available_in"[2]
    )
  ),
  CONSTRAINT "app_eligibility_inputs_order_check" CHECK ("display_order" > 0),
  CONSTRAINT "app_eligibility_inputs_group_check"
    CHECK (("group_key" IS NULL) = ("group_label" IS NULL)),
  CONSTRAINT "app_eligibility_inputs_version_key_unique"
    UNIQUE ("version_id", "stable_key"),
  CONSTRAINT "app_eligibility_inputs_version_order_unique"
    UNIQUE ("version_id", "display_order")
);
--> statement-breakpoint
CREATE INDEX "app_eligibility_inputs_version_idx"
  ON "app_eligibility_input_definitions" ("version_id");
--> statement-breakpoint
CREATE TABLE "app_eligibility_self_check_questions" (
  "input_definition_id" uuid PRIMARY KEY
    REFERENCES "app_eligibility_input_definitions"("id") ON DELETE restrict,
  "prompt" text NOT NULL,
  "help_text" text DEFAULT '' NOT NULL,
  "explanation" text DEFAULT '' NOT NULL,
  "answer_type" text NOT NULL,
  "required" boolean DEFAULT true NOT NULL,
  "options" jsonb DEFAULT '[]'::jsonb NOT NULL,
  CONSTRAINT "app_eligibility_questions_prompt_check"
    CHECK (length(btrim("prompt")) > 0),
  CONSTRAINT "app_eligibility_questions_answer_type_check" CHECK (
    "answer_type" IN (
      'BOOLEAN', 'YES_NO_NA', 'TEXT', 'NUMBER', 'DATE',
      'SINGLE_SELECT', 'MULTI_SELECT'
    )
  ),
  CONSTRAINT "app_eligibility_questions_options_check"
    CHECK (jsonb_typeof("options") = 'array')
);
--> statement-breakpoint
CREATE TABLE "app_eligibility_screening_source_bindings" (
  "input_definition_id" uuid PRIMARY KEY
    REFERENCES "app_eligibility_input_definitions"("id") ON DELETE restrict,
  "source_kind" text NOT NULL,
  "source_definition_id" uuid NOT NULL,
  "source_version_id" uuid,
  "source_key" text NOT NULL,
  "value_path" text NOT NULL,
  CONSTRAINT "app_eligibility_screening_source_kind_check" CHECK (
    "source_kind" IN (
      'APPLICATION_FORM_FIELD', 'FUNDING_CALL_FIELD',
      'WORKFLOW_FORM_FIELD', 'SCREENING_CHECKLIST_ITEM',
      'DOCUMENT_REQUIREMENT_FACT', 'MANUAL_ASSESSMENT',
      'INTEGRATION_OUTPUT'
    )
  ),
  CONSTRAINT "app_eligibility_screening_source_key_check" CHECK (
    length(btrim("source_key")) > 0
    AND length(btrim("value_path")) > 0
  ),
  CONSTRAINT "app_eligibility_screening_source_version_check" CHECK (
    ("source_kind" = 'FUNDING_CALL_FIELD' AND "source_version_id" IS NULL)
    OR ("source_kind" <> 'FUNDING_CALL_FIELD' AND "source_version_id" IS NOT NULL)
  )
);
--> statement-breakpoint
CREATE INDEX "app_eligibility_screening_source_definition_idx"
  ON "app_eligibility_screening_source_bindings" (
    "source_kind", "source_definition_id", "source_version_id"
  );
--> statement-breakpoint
CREATE OR REPLACE FUNCTION require_mutable_eligibility_input(
  target_input_id uuid
)
RETURNS void AS $$
DECLARE target_version_id uuid;
BEGIN
  SELECT version_id INTO target_version_id
  FROM app_eligibility_input_definitions
  WHERE id = target_input_id;
  PERFORM require_mutable_eligibility_rule_set_version(target_version_id);
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION protect_eligibility_input_mutation()
RETURNS trigger AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN
    PERFORM require_mutable_eligibility_rule_set_version(OLD.version_id);
  END IF;
  IF TG_OP <> 'DELETE' THEN
    PERFORM require_mutable_eligibility_rule_set_version(NEW.version_id);
  END IF;
  IF TG_OP = 'UPDATE' AND (
    NEW.id <> OLD.id OR NEW.version_id <> OLD.version_id
    OR NEW.created_by <> OLD.created_by OR NEW.created_at <> OLD.created_at
  ) THEN
    RAISE EXCEPTION 'eligibility input identity and creation audit are immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "app_eligibility_inputs_mutability"
BEFORE INSERT OR UPDATE OR DELETE ON "app_eligibility_input_definitions"
FOR EACH ROW EXECUTE FUNCTION protect_eligibility_input_mutation();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION protect_eligibility_input_binding_mutation()
RETURNS trigger AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN
    PERFORM require_mutable_eligibility_input(OLD.input_definition_id);
  END IF;
  IF TG_OP <> 'DELETE' THEN
    PERFORM require_mutable_eligibility_input(NEW.input_definition_id);
  END IF;
  IF TG_OP = 'UPDATE'
    AND NEW.input_definition_id <> OLD.input_definition_id THEN
    RAISE EXCEPTION 'eligibility input binding identity is immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "app_eligibility_questions_mutability"
BEFORE INSERT OR UPDATE OR DELETE ON "app_eligibility_self_check_questions"
FOR EACH ROW EXECUTE FUNCTION protect_eligibility_input_binding_mutation();
--> statement-breakpoint
CREATE TRIGGER "app_eligibility_screening_sources_mutability"
BEFORE INSERT OR UPDATE OR DELETE ON "app_eligibility_screening_source_bindings"
FOR EACH ROW EXECUTE FUNCTION protect_eligibility_input_binding_mutation();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION validate_eligibility_inputs_for_publication(
  target_version_id uuid
)
RETURNS void AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM app_eligibility_input_definitions input
    LEFT JOIN app_eligibility_self_check_questions question
      ON question.input_definition_id = input.id
    LEFT JOIN app_eligibility_screening_source_bindings source
      ON source.input_definition_id = input.id
    WHERE input.version_id = target_version_id
      AND (
        ('SELF_CHECK' = ANY(input.available_in))
          <> (question.input_definition_id IS NOT NULL)
        OR ('SCREENING' = ANY(input.available_in))
          <> (source.input_definition_id IS NOT NULL)
        OR (
          source.input_definition_id IS NOT NULL
          AND NOT CASE source.source_kind
            WHEN 'APPLICATION_FORM_FIELD' THEN EXISTS (
              SELECT 1 FROM app_form_fields field
              WHERE field.id = source.source_definition_id
                AND field.form_version_id = source.source_version_id
            )
            WHEN 'FUNDING_CALL_FIELD' THEN EXISTS (
              SELECT 1 FROM app_funding_calls funding_call
              WHERE funding_call.id = source.source_definition_id
                AND funding_call.eligibility_rule_set_version_id = target_version_id
            )
            WHEN 'WORKFLOW_FORM_FIELD' THEN EXISTS (
              SELECT 1 FROM app_form_fields field
              WHERE field.id = source.source_definition_id
                AND field.form_version_id = source.source_version_id
            )
            WHEN 'SCREENING_CHECKLIST_ITEM' THEN EXISTS (
              SELECT 1
              FROM app_workflow_stage_checklist_definitions checklist
              JOIN app_workflow_stage_definitions stage
                ON stage.id = checklist.stage_id
              WHERE checklist.id = source.source_definition_id
                AND stage.version_id = source.source_version_id
            )
            WHEN 'DOCUMENT_REQUIREMENT_FACT' THEN EXISTS (
              SELECT 1
              FROM app_workflow_stage_document_requirements requirement
              JOIN app_workflow_stage_definitions stage
                ON stage.id = requirement.stage_id
              WHERE requirement.id = source.source_definition_id
                AND stage.version_id = source.source_version_id
            )
            WHEN 'MANUAL_ASSESSMENT' THEN EXISTS (
              SELECT 1
              FROM app_stage_task_definitions task
              JOIN app_workflow_stage_definitions stage
                ON stage.id = task.stage_id
              WHERE task.id = source.source_definition_id
                AND stage.version_id = source.source_version_id
            )
            WHEN 'INTEGRATION_OUTPUT' THEN FALSE
            ELSE FALSE
          END
        )
      )
  ) THEN
    RAISE EXCEPTION 'eligibility inputs contain missing or unresolved bindings';
  END IF;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION protect_eligibility_rule_set_version_lifecycle()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'DRAFT' OR NEW.row_version <> 1
      OR NEW.published_by IS NOT NULL OR NEW.published_at IS NOT NULL
      OR NEW.retired_at IS NOT NULL THEN
      RAISE EXCEPTION 'eligibility ruleset versions must start as Draft';
    END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'DRAFT' THEN
      RAISE EXCEPTION 'published or retired eligibility ruleset versions cannot be deleted';
    END IF;
    RETURN OLD;
  END IF;
  IF NEW.id <> OLD.id
    OR NEW.rule_set_id <> OLD.rule_set_id
    OR NEW.version_number <> OLD.version_number
    OR NEW.created_by <> OLD.created_by
    OR NEW.created_at <> OLD.created_at
    OR NEW.row_version <> OLD.row_version + 1 THEN
    RAISE EXCEPTION 'invalid eligibility ruleset version identity or concurrency token';
  END IF;
  IF OLD.status = 'DRAFT' AND NEW.status = 'DRAFT'
    AND NEW.published_by IS NOT DISTINCT FROM OLD.published_by
    AND NEW.published_at IS NOT DISTINCT FROM OLD.published_at
    AND NEW.retired_at IS NOT DISTINCT FROM OLD.retired_at THEN
    RETURN NEW;
  END IF;
  IF OLD.status = 'DRAFT' AND NEW.status = 'PUBLISHED'
    AND NEW.published_by IS NOT NULL
    AND NEW.published_at IS NOT NULL
    AND NEW.retired_at IS NULL THEN
    PERFORM validate_eligibility_inputs_for_publication(NEW.id);
    RETURN NEW;
  END IF;
  IF OLD.status = 'PUBLISHED' AND NEW.status = 'RETIRED'
    AND NEW.published_by IS NOT DISTINCT FROM OLD.published_by
    AND NEW.published_at IS NOT DISTINCT FROM OLD.published_at
    AND NEW.retired_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'published and retired eligibility ruleset versions are immutable';
END;
$$ LANGUAGE plpgsql;
