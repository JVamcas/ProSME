ALTER TABLE app_form_versions
  ADD COLUMN submission_mode text NOT NULL DEFAULT 'EXPLICIT';
--> statement-breakpoint
ALTER TABLE app_form_versions
  ADD CONSTRAINT app_form_versions_submission_mode_check
  CHECK (submission_mode IN ('EXPLICIT', 'WITH_TASK_ACTION'));
--> statement-breakpoint
ALTER TABLE app_form_versions
  DISABLE TRIGGER app_form_versions_lifecycle;
--> statement-breakpoint
UPDATE app_form_versions version
SET submission_mode = 'WITH_TASK_ACTION'
FROM app_form_definitions definition
WHERE definition.id = version.form_definition_id
  AND definition.code = 'APPROVAL';
--> statement-breakpoint
ALTER TABLE app_form_versions
  ENABLE TRIGGER app_form_versions_lifecycle;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION protect_form_version_lifecycle()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'DRAFT' OR NEW.row_version <> 1
      OR NEW.published_by IS NOT NULL OR NEW.published_at IS NOT NULL
      OR NEW.retired_at IS NOT NULL THEN
      RAISE EXCEPTION 'form versions must start as Draft';
    END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'DRAFT' THEN
      RAISE EXCEPTION 'published or retired form versions cannot be deleted';
    END IF;
    RETURN OLD;
  END IF;
  IF NEW.id <> OLD.id
    OR NEW.form_definition_id <> OLD.form_definition_id
    OR NEW.version_number <> OLD.version_number
    OR NEW.created_by <> OLD.created_by
    OR NEW.created_at <> OLD.created_at
    OR NEW.row_version <> OLD.row_version + 1 THEN
    RAISE EXCEPTION 'invalid form version identity or concurrency token';
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
    AND NEW.instructions IS NOT DISTINCT FROM OLD.instructions
    AND NEW.submission_mode IS NOT DISTINCT FROM OLD.submission_mode
    AND NEW.submit_label IS NOT DISTINCT FROM OLD.submit_label
    AND NEW.published_by IS NOT DISTINCT FROM OLD.published_by
    AND NEW.published_at IS NOT DISTINCT FROM OLD.published_at
    AND NEW.retired_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'published and retired form versions are immutable';
END;
$$ LANGUAGE plpgsql;
