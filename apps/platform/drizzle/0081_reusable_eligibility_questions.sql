CREATE TABLE "app_eligibility_questions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" text NOT NULL,
  "input_type" text NOT NULL,
  "applicant_label" text NOT NULL,
  "reviewer_label" text NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "row_version" integer DEFAULT 1 NOT NULL,
  "created_by" uuid NOT NULL REFERENCES "app_users"("id") ON DELETE restrict,
  "updated_by" uuid NOT NULL REFERENCES "app_users"("id") ON DELETE restrict,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "app_eligibility_questions_code_check"
    CHECK ("code" ~ '^[A-Z][A-Z0-9_]*$'),
  CONSTRAINT "app_eligibility_questions_type_check"
    CHECK ("input_type" IN (
      'BOOLEAN', 'YES_NO_NA', 'TEXT', 'NUMBER', 'PERCENTAGE', 'DATE'
    )),
  CONSTRAINT "app_eligibility_questions_labels_check"
    CHECK (
      length(btrim("applicant_label")) > 0
      AND length(btrim("reviewer_label")) > 0
    ),
  CONSTRAINT "app_eligibility_questions_row_version_check"
    CHECK ("row_version" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "app_eligibility_questions_code_unique"
  ON "app_eligibility_questions" ("code");
--> statement-breakpoint
CREATE TABLE "app_eligibility_rule_set_question_bindings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "version_id" uuid NOT NULL
    REFERENCES "app_eligibility_rule_set_versions"("id") ON DELETE restrict,
  "question_id" uuid NOT NULL
    REFERENCES "app_eligibility_questions"("id") ON DELETE restrict,
  "code_snapshot" text NOT NULL,
  "input_type_snapshot" text NOT NULL,
  "applicant_label_snapshot" text NOT NULL,
  "reviewer_label_snapshot" text NOT NULL,
  "display_order" integer NOT NULL,
  "created_by" uuid NOT NULL REFERENCES "app_users"("id") ON DELETE restrict,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "app_eligibility_question_bindings_order_check"
    CHECK ("display_order" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "app_eligibility_question_bindings_version_question_unique"
  ON "app_eligibility_rule_set_question_bindings" ("version_id", "question_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "app_eligibility_question_bindings_version_code_unique"
  ON "app_eligibility_rule_set_question_bindings" ("version_id", "code_snapshot");
--> statement-breakpoint
CREATE UNIQUE INDEX "app_eligibility_question_bindings_version_order_unique"
  ON "app_eligibility_rule_set_question_bindings" ("version_id", "display_order");
--> statement-breakpoint
CREATE INDEX "app_eligibility_question_bindings_question_idx"
  ON "app_eligibility_rule_set_question_bindings" ("question_id");
--> statement-breakpoint
INSERT INTO "app_eligibility_questions" (
  "code", "input_type", "applicant_label", "reviewer_label",
  "created_by", "updated_by", "created_at", "updated_at"
)
SELECT DISTINCT ON (upper(input.stable_key))
  upper(input.stable_key),
  CASE
    WHEN question.answer_type IN (
      'BOOLEAN', 'YES_NO_NA', 'TEXT', 'NUMBER', 'PERCENTAGE', 'DATE'
    ) THEN question.answer_type
    ELSE input.data_type
  END,
  coalesce(nullif(btrim(question.prompt), ''), input.label),
  input.label,
  input.created_by,
  input.updated_by,
  input.created_at,
  input.updated_at
FROM "app_eligibility_input_definitions" input
LEFT JOIN "app_eligibility_self_check_questions" question
  ON question.input_definition_id = input.id
ORDER BY upper(input.stable_key), input.updated_at DESC, input.id DESC
ON CONFLICT ("code") DO NOTHING;
--> statement-breakpoint
INSERT INTO "app_eligibility_rule_set_question_bindings" (
  "id", "version_id", "question_id", "code_snapshot",
  "input_type_snapshot", "applicant_label_snapshot",
  "reviewer_label_snapshot", "display_order", "created_by", "created_at"
)
SELECT input.id,
  input.version_id,
  question_definition.id,
  input.stable_key,
  CASE
    WHEN question.answer_type IN (
      'BOOLEAN', 'YES_NO_NA', 'TEXT', 'NUMBER', 'PERCENTAGE', 'DATE'
    ) THEN question.answer_type
    ELSE input.data_type
  END,
  coalesce(nullif(btrim(question.prompt), ''), input.label),
  input.label,
  input.display_order,
  input.created_by,
  input.created_at
FROM "app_eligibility_input_definitions" input
JOIN "app_eligibility_questions" question_definition
  ON question_definition.code = upper(input.stable_key)
LEFT JOIN "app_eligibility_self_check_questions" question
  ON question.input_definition_id = input.id
ON CONFLICT DO NOTHING;
--> statement-breakpoint
ALTER TABLE "app_eligibility_screening_source_bindings"
  DROP CONSTRAINT "app_eligibility_screening_source_kind_check";
--> statement-breakpoint
ALTER TABLE "app_eligibility_screening_source_bindings"
  ADD CONSTRAINT "app_eligibility_screening_source_kind_check" CHECK (
    "source_kind" IN (
      'APPLICATION_FORM_FIELD', 'FUNDING_CALL_FIELD',
      'WORKFLOW_FORM_FIELD', 'SCREENING_CHECKLIST_ITEM',
      'DOCUMENT_REQUIREMENT_FACT', 'MANUAL_ASSESSMENT',
      'INTEGRATION_OUTPUT', 'ELIGIBILITY_QUESTION_RESPONSE'
    )
  );
--> statement-breakpoint
CREATE OR REPLACE FUNCTION protect_eligibility_question_binding()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_version_id uuid;
  target_status text;
BEGIN
  target_version_id := coalesce(NEW.version_id, OLD.version_id);
  SELECT status INTO target_status
  FROM app_eligibility_rule_set_versions
  WHERE id = target_version_id;
  IF target_status IS DISTINCT FROM 'DRAFT' THEN
    RAISE EXCEPTION 'published eligibility question bindings are immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "app_eligibility_question_bindings_draft_only"
BEFORE INSERT OR UPDATE OR DELETE
ON "app_eligibility_rule_set_question_bindings"
FOR EACH ROW EXECUTE FUNCTION protect_eligibility_question_binding();
--> statement-breakpoint
CREATE TABLE "app_eligibility_rule_set_verification_forms" (
  "version_id" uuid PRIMARY KEY NOT NULL
    REFERENCES "app_eligibility_rule_set_versions"("id") ON DELETE restrict,
  "form_version_id" uuid NOT NULL
    REFERENCES "app_form_versions"("id") ON DELETE restrict,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "app_eligibility_verification_forms_form_version_unique"
  ON "app_eligibility_rule_set_verification_forms" ("form_version_id");
--> statement-breakpoint
DO $$
DECLARE
  version_row record;
  generated_definition_id uuid;
  generated_version_id uuid;
  generated_section_id uuid;
  generated_actor_id uuid;
  generated_published_at timestamp with time zone;
BEGIN
  FOR version_row IN
    SELECT version.id, version.version_number, version.rule_set_id,
      definition.code, definition.name, version.created_by,
      version.published_by, version.published_at
    FROM app_eligibility_rule_set_versions version
    JOIN app_eligibility_rule_sets definition
      ON definition.id = version.rule_set_id
    LEFT JOIN app_eligibility_rule_set_verification_forms verification
      ON verification.version_id = version.id
    WHERE version.status = 'PUBLISHED'
      AND verification.version_id IS NULL
  LOOP
    generated_definition_id := gen_random_uuid();
    generated_version_id := gen_random_uuid();
    generated_section_id := gen_random_uuid();
    generated_actor_id := coalesce(
      version_row.published_by,
      version_row.created_by
    );
    generated_published_at := coalesce(version_row.published_at, now());

    INSERT INTO app_form_definitions (
      id, code, name, description, created_by
    ) VALUES (
      generated_definition_id,
      'ELIGIBILITY_VERIFICATION_' || upper(replace(version_row.id::text, '-', '_')),
      version_row.name || ' v' || version_row.version_number || ' verification',
      'Generated from ' || version_row.code || ' v' || version_row.version_number || '.',
      generated_actor_id
    );
    INSERT INTO app_form_versions (
      id, form_definition_id, version_number, status, display_mode,
      instructions, submit_label, created_by
    ) VALUES (
      generated_version_id, generated_definition_id, 1, 'DRAFT',
      'SINGLE_PAGE',
      'Record the verified answers used for eligibility screening.',
      'Complete eligibility verification', generated_actor_id
    );
    INSERT INTO app_form_sections (
      id, form_version_id, key, title, description, column_span,
      show_container, display_order
    ) VALUES (
      generated_section_id, generated_version_id, 'VERIFIED_ELIGIBILITY',
      'Verified eligibility evidence', '', 2, true, 1
    );
    INSERT INTO app_form_fields (
      id, form_version_id, section_id, column_span, key, label, type,
      required, minimum, maximum, display_order
    )
    SELECT gen_random_uuid(), generated_version_id, generated_section_id, 1,
      binding.code_snapshot, binding.reviewer_label_snapshot,
      CASE binding.input_type_snapshot
        WHEN 'BOOLEAN' THEN 'YES_NO'
        WHEN 'YES_NO_NA' THEN 'SINGLE_SELECT'
        ELSE binding.input_type_snapshot
      END,
      true,
      CASE WHEN binding.input_type_snapshot = 'PERCENTAGE' THEN 0 END,
      CASE WHEN binding.input_type_snapshot = 'PERCENTAGE' THEN 100 END,
      row_number() OVER (ORDER BY binding.display_order)::integer
    FROM app_eligibility_rule_set_question_bindings binding
    WHERE binding.version_id = version_row.id
      AND EXISTS (
        SELECT 1
        FROM app_eligibility_rules rule
        JOIN app_condition_groups condition_group
          ON condition_group.id = rule.condition_group_id
        CROSS JOIN LATERAL jsonb_path_query(
          condition_group.definition,
          '$.** ? (@.kind == "FIELD").key'
        ) path(value)
        WHERE rule.version_id = binding.version_id
          AND rule.execution_mode IN ('SCREENING', 'BOTH')
          AND trim(both '"' from path.value::text)
            = 'eligibility.' || binding.code_snapshot
      )
    ORDER BY binding.display_order;
    INSERT INTO app_form_field_options (field_id, key, label, display_order)
    SELECT field.id, option.key, option.label, option.display_order
    FROM app_form_fields field
    CROSS JOIN (VALUES
      ('YES', 'Yes', 1),
      ('NO', 'No', 2),
      ('NOT_APPLICABLE', 'Not applicable', 3)
    ) AS option(key, label, display_order)
    WHERE field.form_version_id = generated_version_id
      AND field.type = 'SINGLE_SELECT';
    UPDATE app_form_versions
    SET status = 'PUBLISHED', published_by = generated_actor_id,
      published_at = generated_published_at,
      updated_at = generated_published_at,
      row_version = 2
    WHERE id = generated_version_id;
    INSERT INTO app_eligibility_rule_set_verification_forms (
      version_id, form_version_id
    ) VALUES (version_row.id, generated_version_id);
  END LOOP;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION validate_no_unresolved_eligibility_references(
  target_version_id uuid
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM app_eligibility_rules rule
    JOIN app_condition_groups condition_group
      ON condition_group.id = rule.condition_group_id
    CROSS JOIN LATERAL jsonb_path_query(
      condition_group.definition,
      '$.** ? (@.kind == "FIELD").key'
    ) path(value)
    LEFT JOIN app_eligibility_rule_set_question_bindings binding
      ON binding.version_id = rule.version_id
      AND 'eligibility.' || binding.code_snapshot
        = trim(both '"' from path.value::text)
    WHERE rule.version_id = target_version_id
      AND (
        trim(both '"' from path.value::text) NOT LIKE 'eligibility.%'
        AND trim(both '"' from path.value::text) NOT LIKE 'fundingCall.%'
        AND trim(both '"' from path.value::text) NOT LIKE 'application.%'
        OR trim(both '"' from path.value::text) LIKE 'eligibility.%'
          AND binding.id IS NULL
        OR trim(both '"' from path.value::text) LIKE 'application.%'
          AND rule.execution_mode <> 'SCREENING'
      )
  ) THEN
    RAISE EXCEPTION 'eligibility rules contain unresolved field references';
  END IF;
END;
$$;
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
    PERFORM validate_no_unresolved_eligibility_references(NEW.id);
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
--> statement-breakpoint
INSERT INTO app_capabilities (code, description)
VALUES
  ('eligibility.question.read', 'Read reusable eligibility questions.'),
  ('eligibility.question.create', 'Create reusable eligibility questions.'),
  ('eligibility.question.update', 'Update reusable eligibility questions.')
ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;
--> statement-breakpoint
WITH mapping(question_permission, ruleset_permission) AS (
  VALUES
    ('eligibility.question.read', 'eligibility.ruleset.read'),
    ('eligibility.question.create', 'eligibility.ruleset.create'),
    ('eligibility.question.update', 'eligibility.ruleset.update')
)
INSERT INTO app_role_capabilities (role_id, capability_id)
SELECT grant_row.role_id, question_capability.id
FROM mapping
JOIN app_capabilities ruleset_capability
  ON ruleset_capability.code = mapping.ruleset_permission
JOIN app_role_capabilities grant_row
  ON grant_row.capability_id = ruleset_capability.id
JOIN app_capabilities question_capability
  ON question_capability.code = mapping.question_permission
ON CONFLICT (role_id, capability_id) DO NOTHING;
