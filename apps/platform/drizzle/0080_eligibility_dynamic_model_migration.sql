CREATE TABLE "app_eligibility_configuration_issues" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "version_id" uuid NOT NULL
    REFERENCES "app_eligibility_rule_set_versions"("id") ON DELETE restrict,
  "rule_id" uuid REFERENCES "app_eligibility_rules"("id") ON DELETE restrict,
  "origin" text NOT NULL,
  "reference_path" text NOT NULL,
  "message" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "app_eligibility_configuration_issues_origin_check"
    CHECK ("origin" IN ('LEGACY_MIGRATION', 'BASELINE_SEED')),
  CONSTRAINT "app_eligibility_configuration_issues_message_check"
    CHECK (length(btrim("message")) > 0),
  CONSTRAINT "app_eligibility_configuration_issues_unique"
    UNIQUE ("version_id", "rule_id", "origin", "reference_path")
);
--> statement-breakpoint
CREATE INDEX "app_eligibility_configuration_issues_version_idx"
  ON "app_eligibility_configuration_issues" ("version_id", "created_at");
--> statement-breakpoint
CREATE TABLE "app_eligibility_seed_reviews" (
  "version_id" uuid PRIMARY KEY
    REFERENCES "app_eligibility_rule_set_versions"("id") ON DELETE restrict,
  "source_document" text NOT NULL,
  "approval_basis" text NOT NULL,
  "approved_by" text NOT NULL,
  "approved_at" timestamp with time zone NOT NULL,
  "decision_snapshot" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "app_eligibility_seed_reviews_snapshot_check"
    CHECK (jsonb_typeof("decision_snapshot") = 'array')
);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION rewrite_eligibility_field_references(
  node jsonb,
  replacements jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  item record;
  result jsonb;
  replacement text;
BEGIN
  IF jsonb_typeof(node) = 'object' THEN
    IF node->>'kind' = 'FIELD' AND node ? 'key' THEN
      replacement := replacements->>(node->>'key');
      IF replacement IS NOT NULL THEN
        RETURN jsonb_set(node, '{key}', to_jsonb(replacement));
      END IF;
    END IF;
    result := '{}'::jsonb;
    FOR item IN SELECT key, value FROM jsonb_each(node)
    LOOP
      result := result || jsonb_build_object(
        item.key,
        rewrite_eligibility_field_references(item.value, replacements)
      );
    END LOOP;
    RETURN result;
  END IF;
  IF jsonb_typeof(node) = 'array' THEN
    SELECT coalesce(jsonb_agg(
      rewrite_eligibility_field_references(value, replacements)
      ORDER BY ordinality
    ), '[]'::jsonb)
    INTO result
    FROM jsonb_array_elements(node) WITH ORDINALITY AS items(value, ordinality);
    RETURN result;
  END IF;
  RETURN node;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION migrate_draft_eligibility_configuration()
RETURNS TABLE (
  migrated_versions integer,
  migrated_inputs integer,
  unresolved_references integer
)
LANGUAGE plpgsql
AS $$
DECLARE
  version_row record;
  reference_row record;
  source_row record;
  screening_row record;
  replacement_map jsonb;
  new_group_id uuid;
  target_stable_key text;
  input_modes text[];
  answer_type text;
  migrated_version_count integer := 0;
  migrated_input_count integer := 0;
  inserted_count integer := 0;
BEGIN
  FOR version_row IN
    SELECT version.id
    FROM app_eligibility_rule_set_versions version
    WHERE version.status = 'DRAFT'
      AND EXISTS (
        SELECT 1
        FROM app_eligibility_rules rule
        WHERE rule.version_id = version.id
      )
  LOOP
    replacement_map := '{}'::jsonb;

    FOR reference_row IN
      SELECT DISTINCT rule.id AS rule_id, path.value #>> '{}' AS path,
        bool_or(rule.execution_mode IN ('SELF_CHECK', 'BOTH')) OVER (
          PARTITION BY path.value #>> '{}'
        ) AS self_check,
        bool_or(rule.execution_mode IN ('SCREENING', 'BOTH')) OVER (
          PARTITION BY path.value #>> '{}'
        ) AS screening
      FROM app_eligibility_rules rule
      JOIN app_condition_groups condition_group
        ON condition_group.id = rule.condition_group_id
      CROSS JOIN LATERAL jsonb_path_query(
        condition_group.definition,
        '$.** ? (@.kind == "FIELD").key'
      ) path(value)
      WHERE rule.version_id = version_row.id
        AND path.value #>> '{}' NOT LIKE 'eligibility.%'
    LOOP
      SELECT NULL::uuid AS id, NULL::uuid AS form_version_id,
        NULL::text AS key, NULL::text AS label, NULL::text AS data_type,
        NULL::text AS form_type
      INTO source_row;
      IF reference_row.path LIKE 'application.%' THEN
        SELECT field.id, field.form_version_id, field.key, field.label,
          CASE field.type
            WHEN 'NUMBER' THEN 'NUMBER'
            WHEN 'CURRENCY' THEN 'NUMBER'
            WHEN 'PERCENTAGE' THEN 'NUMBER'
            WHEN 'DATE' THEN 'DATE'
            WHEN 'YES_NO' THEN 'BOOLEAN'
            WHEN 'TEXT' THEN 'TEXT'
            WHEN 'TEXTAREA' THEN 'TEXT'
            WHEN 'SINGLE_SELECT' THEN 'TEXT'
            ELSE NULL
          END AS data_type,
          field.type AS form_type
        INTO source_row
        FROM app_funding_calls funding_call
        JOIN app_form_fields field
          ON field.form_version_id = funding_call.form_version_id
          AND field.key = substr(reference_row.path, length('application.') + 1)
        WHERE funding_call.eligibility_rule_set_version_id = version_row.id
        GROUP BY field.id, field.form_version_id, field.key, field.label,
          field.type
        HAVING count(DISTINCT funding_call.id) = (
          SELECT count(*)
          FROM app_funding_calls bound_call
          WHERE bound_call.eligibility_rule_set_version_id = version_row.id
        )
          AND count(DISTINCT funding_call.form_version_id) = 1
        LIMIT 1;
      END IF;

      IF source_row.id IS NULL OR source_row.data_type IS NULL THEN
        INSERT INTO app_eligibility_configuration_issues (
          version_id, rule_id, origin, reference_path, message
        ) VALUES (
          version_row.id,
          reference_row.rule_id,
          'LEGACY_MIGRATION',
          reference_row.path,
          'No single compatible bound Application Form field can map this legacy reference.'
        ) ON CONFLICT DO NOTHING;
        CONTINUE;
      END IF;

      target_stable_key := lower(regexp_replace(
        source_row.key,
        '[^A-Za-z0-9]+',
        '_',
        'g'
      ));
      target_stable_key := regexp_replace(
        target_stable_key,
        '^_+|_+$',
        '',
        'g'
      );
      IF target_stable_key !~ '^[a-z][a-z0-9_]*$' THEN
        INSERT INTO app_eligibility_configuration_issues (
          version_id, rule_id, origin, reference_path, message
        ) VALUES (
          version_row.id,
          reference_row.rule_id,
          'LEGACY_MIGRATION',
          reference_row.path,
          'The legacy reference cannot produce a valid Eligibility Input stable key.'
        ) ON CONFLICT DO NOTHING;
        CONTINUE;
      END IF;

      input_modes := ARRAY[]::text[];
      IF reference_row.self_check THEN
        input_modes := array_append(input_modes, 'SELF_CHECK');
      END IF;
      IF reference_row.screening THEN
        SELECT NULL::uuid AS id, NULL::uuid AS form_version_id,
          NULL::text AS key
        INTO screening_row;
        SELECT field.id, field.form_version_id, field.key
        INTO screening_row
        FROM app_funding_calls funding_call
        JOIN app_workflow_stage_definitions stage
          ON stage.version_id = funding_call.workflow_template_version_id
        JOIN app_stage_task_definitions task
          ON task.stage_id = stage.id
          AND task.code = 'ELIGIBILITY_VERIFICATION'
        JOIN app_stage_task_form_bindings binding
          ON binding.task_definition_id = task.id
        JOIN app_form_fields field
          ON field.form_version_id = binding.form_version_id
          AND field.key = upper(target_stable_key)
        WHERE funding_call.eligibility_rule_set_version_id = version_row.id
        GROUP BY field.id, field.form_version_id, field.key
        HAVING count(DISTINCT funding_call.id) = (
          SELECT count(*)
          FROM app_funding_calls bound_call
          WHERE bound_call.eligibility_rule_set_version_id = version_row.id
        )
          AND count(DISTINCT funding_call.workflow_template_version_id) = 1
        LIMIT 1;
        IF screening_row.id IS NOT NULL THEN
          input_modes := array_append(input_modes, 'SCREENING');
        ELSE
          INSERT INTO app_eligibility_configuration_issues (
            version_id, rule_id, origin, reference_path, message
          ) VALUES (
            version_row.id,
            reference_row.rule_id,
            'LEGACY_MIGRATION',
            reference_row.path,
            'No verified workflow output can map this Screening reference.'
          ) ON CONFLICT DO NOTHING;
        END IF;
      END IF;
      IF cardinality(input_modes) = 0 THEN
        CONTINUE;
      END IF;
      answer_type := CASE source_row.form_type
        WHEN 'PERCENTAGE' THEN 'PERCENTAGE'
        ELSE source_row.data_type
      END;

      INSERT INTO app_eligibility_input_definitions (
        version_id, stable_key, label, data_type, available_in,
        display_order, created_by, updated_by
      )
      SELECT version_row.id, target_stable_key, source_row.label,
        source_row.data_type, input_modes,
        coalesce(max(existing.display_order), 0) + 1,
        version.created_by, version.created_by
      FROM app_eligibility_rule_set_versions version
      LEFT JOIN app_eligibility_input_definitions existing
        ON existing.version_id = version.id
      WHERE version.id = version_row.id
      GROUP BY version.created_by
      ON CONFLICT (version_id, stable_key) DO NOTHING;
      GET DIAGNOSTICS inserted_count = ROW_COUNT;
      migrated_input_count := migrated_input_count + inserted_count;

      INSERT INTO app_eligibility_self_check_questions (
        input_definition_id, prompt, help_text, explanation,
        answer_type, required, options
      )
      SELECT input.id, source_row.label, '',
        'Migrated from ' || reference_row.path || '.',
        answer_type, true, '[]'::jsonb
      FROM app_eligibility_input_definitions input
      WHERE input.version_id = version_row.id
        AND input.stable_key = target_stable_key
        AND reference_row.self_check
      ON CONFLICT (input_definition_id) DO NOTHING;

      INSERT INTO app_eligibility_screening_source_bindings (
        input_definition_id, source_kind, source_definition_id,
        source_version_id, source_key, value_path
      )
      SELECT input.id, 'WORKFLOW_FORM_FIELD', screening_row.id,
        screening_row.form_version_id, screening_row.key, 'value'
      FROM app_eligibility_input_definitions input
      WHERE input.version_id = version_row.id
        AND input.stable_key = target_stable_key
        AND reference_row.screening
        AND screening_row.id IS NOT NULL
      ON CONFLICT (input_definition_id) DO NOTHING;

      replacement_map := replacement_map || jsonb_build_object(
        reference_row.path,
        'eligibility.' || target_stable_key
      );
    END LOOP;

    IF replacement_map <> '{}'::jsonb THEN
      FOR reference_row IN
        SELECT DISTINCT rule.condition_group_id
        FROM app_eligibility_rules rule
        WHERE rule.version_id = version_row.id
      LOOP
        new_group_id := gen_random_uuid();
        INSERT INTO app_condition_groups (id, definition)
        SELECT new_group_id,
          jsonb_set(
            rewrite_eligibility_field_references(definition, replacement_map),
            '{id}',
            to_jsonb(new_group_id::text)
          )
        FROM app_condition_groups
        WHERE id = reference_row.condition_group_id;

        UPDATE app_eligibility_rules
        SET condition_group_id = new_group_id
        WHERE version_id = version_row.id
          AND condition_group_id = reference_row.condition_group_id;
      END LOOP;
      migrated_version_count := migrated_version_count + 1;
    END IF;
  END LOOP;

  RETURN QUERY SELECT
    migrated_version_count,
    migrated_input_count,
    (SELECT count(*)::integer
     FROM app_eligibility_configuration_issues
     WHERE origin = 'LEGACY_MIGRATION');
END;
$$;
--> statement-breakpoint
SELECT * FROM migrate_draft_eligibility_configuration();
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
    WHERE rule.version_id = target_version_id
      AND path.value #>> '{}' NOT LIKE 'eligibility.%'
  ) OR EXISTS (
    SELECT 1
    FROM app_eligibility_rules rule
    JOIN app_condition_groups condition_group
      ON condition_group.id = rule.condition_group_id
    CROSS JOIN LATERAL jsonb_path_query(
      condition_group.definition,
      '$.** ? (@.kind == "FIELD").key'
    ) path(value)
    LEFT JOIN app_eligibility_input_definitions input
      ON input.version_id = rule.version_id
      AND input.stable_key = substr(
        path.value #>> '{}',
        length('eligibility.') + 1
      )
    WHERE rule.version_id = target_version_id
      AND path.value #>> '{}' LIKE 'eligibility.%'
      AND (
        input.id IS NULL
        OR (
          rule.execution_mode IN ('SELF_CHECK', 'BOTH')
          AND NOT ('SELF_CHECK' = ANY(input.available_in))
        )
        OR (
          rule.execution_mode IN ('SCREENING', 'BOTH')
          AND NOT ('SCREENING' = ANY(input.available_in))
        )
      )
  ) THEN
    RAISE EXCEPTION 'eligibility rules contain unresolved migrated references';
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
