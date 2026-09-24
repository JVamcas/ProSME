CREATE TABLE "app_eligibility_rule_sets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" text NOT NULL,
  "name" text NOT NULL,
  "description" text DEFAULT '' NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_by" uuid NOT NULL REFERENCES "app_users"("id") ON DELETE restrict,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "app_eligibility_rule_sets_code_unique"
  ON "app_eligibility_rule_sets" ("code");
--> statement-breakpoint
CREATE TABLE "app_eligibility_rule_set_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "rule_set_id" uuid NOT NULL
    REFERENCES "app_eligibility_rule_sets"("id") ON DELETE restrict,
  "version_number" integer NOT NULL,
  "status" text DEFAULT 'DRAFT' NOT NULL,
  "row_version" integer DEFAULT 1 NOT NULL,
  "created_by" uuid NOT NULL REFERENCES "app_users"("id") ON DELETE restrict,
  "published_by" uuid REFERENCES "app_users"("id") ON DELETE restrict,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "published_at" timestamp with time zone,
  "retired_at" timestamp with time zone,
  CONSTRAINT "app_eligibility_rule_set_versions_status_check"
    CHECK ("status" IN ('DRAFT', 'PUBLISHED', 'RETIRED')),
  CONSTRAINT "app_eligibility_rule_set_versions_number_check"
    CHECK ("version_number" > 0),
  CONSTRAINT "app_eligibility_rule_set_versions_row_version_check"
    CHECK ("row_version" > 0),
  CONSTRAINT "app_eligibility_rule_set_versions_number_unique"
    UNIQUE ("rule_set_id", "version_number")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "app_eligibility_rule_set_versions_one_draft_unique"
  ON "app_eligibility_rule_set_versions" ("rule_set_id")
  WHERE "status" = 'DRAFT';
--> statement-breakpoint
CREATE INDEX "app_eligibility_rule_set_versions_status_idx"
  ON "app_eligibility_rule_set_versions" ("rule_set_id", "status");
--> statement-breakpoint
CREATE TABLE "app_eligibility_rules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "version_id" uuid NOT NULL
    REFERENCES "app_eligibility_rule_set_versions"("id") ON DELETE restrict,
  "condition_group_id" uuid NOT NULL
    REFERENCES "app_condition_groups"("id") ON DELETE restrict,
  "condition_kind" text NOT NULL,
  "condition_id" uuid,
  "failure_type" text NOT NULL,
  "reason_code" text NOT NULL,
  "applicant_message" text NOT NULL,
  "execution_mode" text NOT NULL,
  "display_order" integer NOT NULL,
  CONSTRAINT "app_eligibility_rules_condition_reference_check" CHECK (
    ("condition_kind" = 'GROUP' AND "condition_id" IS NULL)
    OR ("condition_kind" = 'CONDITION' AND "condition_id" IS NOT NULL)
  ),
  CONSTRAINT "app_eligibility_rules_failure_type_check"
    CHECK ("failure_type" IN ('HARD_FAIL', 'SOFT_FAIL', 'WARNING')),
  CONSTRAINT "app_eligibility_rules_execution_mode_check"
    CHECK ("execution_mode" IN ('SELF_CHECK', 'SCREENING', 'BOTH')),
  CONSTRAINT "app_eligibility_rules_reason_code_check"
    CHECK ("reason_code" ~ '^[A-Z][A-Z0-9_]*$'),
  CONSTRAINT "app_eligibility_rules_message_check"
    CHECK (length(btrim("applicant_message")) > 0),
  CONSTRAINT "app_eligibility_rules_order_check" CHECK ("display_order" > 0),
  CONSTRAINT "app_eligibility_rules_version_reason_unique"
    UNIQUE ("version_id", "reason_code"),
  CONSTRAINT "app_eligibility_rules_version_order_unique"
    UNIQUE ("version_id", "display_order")
);
--> statement-breakpoint
CREATE INDEX "app_eligibility_rules_condition_group_idx"
  ON "app_eligibility_rules" ("condition_group_id");
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
CREATE TRIGGER "app_eligibility_rule_set_versions_lifecycle"
BEFORE INSERT OR UPDATE OR DELETE ON "app_eligibility_rule_set_versions"
FOR EACH ROW EXECUTE FUNCTION protect_eligibility_rule_set_version_lifecycle();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION require_mutable_eligibility_rule_set_version(
  target_id uuid
)
RETURNS void AS $$
DECLARE version_status text;
BEGIN
  SELECT status INTO version_status
  FROM app_eligibility_rule_set_versions
  WHERE id = target_id
  FOR UPDATE;
  IF version_status IS DISTINCT FROM 'DRAFT' THEN
    RAISE EXCEPTION 'only draft eligibility ruleset versions are editable';
  END IF;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION protect_eligibility_rule_mutation()
RETURNS trigger AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN
    PERFORM require_mutable_eligibility_rule_set_version(OLD.version_id);
  END IF;
  IF TG_OP <> 'DELETE' THEN
    PERFORM require_mutable_eligibility_rule_set_version(NEW.version_id);
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "app_eligibility_rules_mutability"
BEFORE INSERT OR UPDATE OR DELETE ON "app_eligibility_rules"
FOR EACH ROW EXECUTE FUNCTION protect_eligibility_rule_mutation();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION validate_eligibility_condition_reference()
RETURNS trigger AS $$
DECLARE group_definition jsonb;
BEGIN
  SELECT definition INTO group_definition
  FROM app_condition_groups
  WHERE id = NEW.condition_group_id;
  IF group_definition IS NULL THEN
    RAISE EXCEPTION 'referenced condition group does not exist';
  END IF;
  IF NEW.condition_kind = 'CONDITION' AND NOT jsonb_path_exists(
    group_definition,
    '$.** ? (@.kind == "CONDITION" && @.id == $conditionId)',
    jsonb_build_object('conditionId', NEW.condition_id::text)
  ) THEN
    RAISE EXCEPTION 'referenced condition does not exist in its group';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "app_eligibility_rules_condition_reference"
BEFORE INSERT OR UPDATE ON "app_eligibility_rules"
FOR EACH ROW EXECUTE FUNCTION validate_eligibility_condition_reference();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION protect_published_eligibility_condition_group()
RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM app_eligibility_rules rule
    JOIN app_eligibility_rule_set_versions version
      ON version.id = rule.version_id
    WHERE rule.condition_group_id = OLD.id
      AND version.status IN ('PUBLISHED', 'RETIRED')
  ) THEN
    RAISE EXCEPTION 'conditions referenced by published eligibility rules are immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "app_condition_groups_eligibility_immutability"
BEFORE UPDATE OR DELETE ON "app_condition_groups"
FOR EACH ROW EXECUTE FUNCTION protect_published_eligibility_condition_group();
--> statement-breakpoint
INSERT INTO "app_capabilities" ("code", "description") VALUES
  ('eligibility.ruleset.read', 'Read eligibility rulesets and exact versions'),
  ('eligibility.ruleset.create', 'Create eligibility rulesets'),
  ('eligibility.ruleset.update', 'Update draft eligibility ruleset versions'),
  ('eligibility.ruleset.publish', 'Publish eligibility ruleset versions'),
  ('eligibility.ruleset.retire', 'Retire eligibility ruleset versions')
ON CONFLICT ("code") DO UPDATE SET "description" = EXCLUDED."description";
--> statement-breakpoint
INSERT INTO "app_role_capabilities" ("role_id", "capability_id")
SELECT role_row.id, capability_row.id
FROM "app_roles" role_row
CROSS JOIN "app_capabilities" capability_row
WHERE role_row.code = 'system_administrator'
  AND capability_row.code IN (
    'eligibility.ruleset.read',
    'eligibility.ruleset.create',
    'eligibility.ruleset.update',
    'eligibility.ruleset.publish',
    'eligibility.ruleset.retire'
  )
ON CONFLICT ("role_id", "capability_id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "app_role_capabilities" ("role_id", "capability_id")
SELECT role_row.id, capability_row.id
FROM "app_roles" role_row
CROSS JOIN "app_capabilities" capability_row
WHERE role_row.code = 'programme_officer'
  AND capability_row.code = 'eligibility.ruleset.read'
ON CONFLICT ("role_id", "capability_id") DO NOTHING;
