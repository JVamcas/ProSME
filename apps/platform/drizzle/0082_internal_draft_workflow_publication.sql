-- Temporary internal-testing exception: allow an authorized, validated Draft
-- Workflow Template Version to be published directly. The application layer
-- retains permission, validation, concurrency, idempotency and audit controls.
CREATE OR REPLACE FUNCTION protect_workflow_version_lifecycle()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'DRAFT' OR NEW.row_version <> 1
      OR NEW.published_by IS NOT NULL OR NEW.published_at IS NOT NULL
      OR NEW.retired_at IS NOT NULL THEN
      RAISE EXCEPTION 'workflow versions must start as Draft';
    END IF;
    IF NEW.metadata->>'code' = '' THEN
      SELECT jsonb_build_object('code', code, 'name', name, 'description', description)
      INTO NEW.metadata FROM app_workflow_definitions WHERE id = NEW.definition_id;
    END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'DRAFT' OR workflow_version_has_instances(OLD.id) THEN
      RAISE EXCEPTION 'non-draft workflow versions cannot be deleted';
    END IF;
    RETURN OLD;
  END IF;
  IF NEW.id <> OLD.id OR NEW.definition_id <> OLD.definition_id
    OR NEW.version_number <> OLD.version_number OR NEW.created_by <> OLD.created_by
    OR NEW.created_at <> OLD.created_at OR NEW.row_version <> OLD.row_version + 1 THEN
    RAISE EXCEPTION 'invalid workflow version identity or concurrency token';
  END IF;
  IF OLD.status = 'DRAFT' AND NEW.status = 'DRAFT'
    AND NEW.published_by IS NOT DISTINCT FROM OLD.published_by
    AND NEW.published_at IS NOT DISTINCT FROM OLD.published_at
    AND NEW.retired_at IS NOT DISTINCT FROM OLD.retired_at
    AND NOT workflow_version_has_instances(OLD.id) THEN
    RETURN NEW;
  END IF;
  IF NEW.metadata IS DISTINCT FROM OLD.metadata THEN
    RAISE EXCEPTION 'non-draft workflow version metadata is immutable';
  END IF;
  IF (
    (OLD.status = 'DRAFT' AND NEW.status = 'PENDING_APPROVAL')
    OR (OLD.status = 'PENDING_APPROVAL' AND NEW.status IN ('DRAFT', 'APPROVED'))
  ) AND NEW.published_by IS NOT DISTINCT FROM OLD.published_by
    AND NEW.published_at IS NOT DISTINCT FROM OLD.published_at
    AND NEW.retired_at IS NOT DISTINCT FROM OLD.retired_at THEN
    RETURN NEW;
  END IF;
  IF OLD.status IN ('DRAFT', 'APPROVED') AND NEW.status = 'PUBLISHED'
    AND NEW.published_by IS NOT NULL AND NEW.published_at IS NOT NULL
    AND NEW.retired_at IS NULL THEN
    RETURN NEW;
  END IF;
  IF OLD.status = 'PUBLISHED' AND NEW.status = 'RETIRED'
    AND NEW.published_by IS NOT DISTINCT FROM OLD.published_by
    AND NEW.published_at IS NOT DISTINCT FROM OLD.published_at
    AND NEW.retired_at IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM app_funding_opportunity_workflows WHERE workflow_version_id = OLD.id
    ) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'invalid workflow version lifecycle transition';
END;
$$ LANGUAGE plpgsql;
