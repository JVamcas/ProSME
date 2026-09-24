-- Preserve existing IDs and exact runtime/assignment foreign keys. These legacy
-- physical tables now implement WorkflowTemplate and WorkflowTemplateVersion.
ALTER TABLE app_workflow_definition_versions
  ADD COLUMN metadata jsonb NOT NULL DEFAULT '{"code":"","name":"","description":""}'::jsonb;
--> statement-breakpoint
ALTER TABLE app_workflow_definition_versions DISABLE TRIGGER app_workflow_versions_lifecycle;
--> statement-breakpoint
UPDATE app_workflow_definition_versions version
SET metadata = jsonb_build_object(
  'code', template.code, 'name', template.name, 'description', template.description
)
FROM app_workflow_definitions template
WHERE template.id = version.definition_id;
--> statement-breakpoint
ALTER TABLE app_workflow_definition_versions ENABLE TRIGGER app_workflow_versions_lifecycle;
--> statement-breakpoint
ALTER TABLE app_workflow_definition_versions
  DROP CONSTRAINT app_workflow_versions_status_check,
  ADD CONSTRAINT app_workflow_versions_status_check
    CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PUBLISHED', 'RETIRED'));
--> statement-breakpoint
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
  IF OLD.status = 'APPROVED' AND NEW.status = 'PUBLISHED'
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
--> statement-breakpoint
DROP TRIGGER app_workflow_versions_lifecycle ON app_workflow_definition_versions;
--> statement-breakpoint
CREATE TRIGGER app_workflow_versions_lifecycle
BEFORE INSERT OR UPDATE OR DELETE ON app_workflow_definition_versions
FOR EACH ROW EXECUTE FUNCTION protect_workflow_version_lifecycle();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION require_mutable_workflow_version(target_id uuid)
RETURNS void AS $$
DECLARE version_status text;
BEGIN
  -- Serialize child writes with approval/publication, checking both parents when
  -- a child is moved. Publication can never race a child content mutation.
  SELECT status INTO version_status FROM app_workflow_definition_versions
  WHERE id = target_id FOR UPDATE;
  IF version_status IS DISTINCT FROM 'DRAFT' OR workflow_version_has_instances(target_id) THEN
    RAISE EXCEPTION 'only draft workflow versions are editable';
  END IF;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_immutable_workflow_child_mutation()
RETURNS trigger AS $$
DECLARE old_version_id uuid; new_version_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'app_stage_task_definitions' THEN
    IF TG_OP <> 'INSERT' THEN
      SELECT version_id INTO old_version_id FROM app_workflow_stage_definitions WHERE id = OLD.stage_id;
    END IF;
    IF TG_OP <> 'DELETE' THEN
      SELECT version_id INTO new_version_id FROM app_workflow_stage_definitions WHERE id = NEW.stage_id;
    END IF;
  ELSE
    IF TG_OP <> 'INSERT' THEN old_version_id := OLD.version_id; END IF;
    IF TG_OP <> 'DELETE' THEN new_version_id := NEW.version_id; END IF;
  END IF;
  IF TG_OP <> 'INSERT' THEN PERFORM require_mutable_workflow_version(old_version_id); END IF;
  IF TG_OP <> 'DELETE' THEN PERFORM require_mutable_workflow_version(new_version_id); END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
INSERT INTO app_capabilities (code, description) VALUES
  ('workflow.definition.submit.all', 'Submit any draft workflow template version for approval'),
  ('workflow.definition.return.all', 'Return any pending workflow template version to draft with a reason'),
  ('workflow.definition.approve.all', 'Approve any pending workflow template version without publishing it')
ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;
--> statement-breakpoint
INSERT INTO app_role_capabilities (role_id, capability_id)
SELECT role_row.id, capability_row.id
FROM app_roles role_row CROSS JOIN app_capabilities capability_row
WHERE role_row.code = 'system_administrator'
  AND capability_row.code IN (
    'workflow.definition.submit.all', 'workflow.definition.return.all', 'workflow.definition.approve.all'
  )
ON CONFLICT (role_id, capability_id) DO NOTHING;
