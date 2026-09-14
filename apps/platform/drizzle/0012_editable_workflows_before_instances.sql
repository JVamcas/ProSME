CREATE OR REPLACE FUNCTION workflow_version_has_instances(target_version_id uuid)
RETURNS boolean AS $$
DECLARE has_instances boolean;
BEGIN
  IF to_regclass('public.app_workflow_instances') IS NULL THEN
    RETURN false;
  END IF;
  EXECUTE
    'SELECT EXISTS (
       SELECT 1 FROM app_workflow_instances WHERE workflow_version_id = $1
     )'
    INTO has_instances
    USING target_version_id;
  RETURN has_instances;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_immutable_workflow_child_mutation()
RETURNS trigger AS $$
DECLARE parent_version_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'app_stage_task_definitions' THEN
    SELECT "version_id" INTO parent_version_id
    FROM "app_workflow_stage_definitions"
    WHERE "id" = CASE
      WHEN TG_OP = 'DELETE' THEN OLD."stage_id"
      ELSE NEW."stage_id"
    END;
  ELSE
    parent_version_id := CASE
      WHEN TG_OP = 'DELETE' THEN OLD."version_id"
      ELSE NEW."version_id"
    END;
  END IF;
  IF workflow_version_has_instances(parent_version_id) THEN
    RAISE EXCEPTION 'workflow versions with runtime instances are immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION protect_workflow_version_lifecycle()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD."status" <> 'DRAFT' THEN
    RAISE EXCEPTION 'published and retired workflow versions cannot be deleted';
  END IF;
  IF TG_OP = 'UPDATE' AND workflow_version_has_instances(OLD."id") THEN
    RAISE EXCEPTION 'workflow versions with runtime instances are immutable';
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
        NEW."status" = OLD."status"
        AND NEW."published_by" IS NOT DISTINCT FROM OLD."published_by"
        AND NEW."published_at" IS NOT DISTINCT FROM OLD."published_at"
        AND NEW."retired_at" IS NOT DISTINCT FROM OLD."retired_at"
      ) OR (
        OLD."status" = 'DRAFT' AND NEW."status" = 'PUBLISHED'
        AND NEW."published_by" IS NOT NULL
        AND NEW."published_at" IS NOT NULL
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
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
