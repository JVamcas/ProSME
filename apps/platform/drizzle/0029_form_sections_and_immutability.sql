CREATE TABLE app_form_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_version_id uuid NOT NULL
    REFERENCES app_form_versions(id) ON DELETE RESTRICT,
  key text NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  display_order integer NOT NULL,
  CONSTRAINT app_form_sections_version_key_unique
    UNIQUE (form_version_id, key),
  CONSTRAINT app_form_sections_version_order_unique
    UNIQUE (form_version_id, display_order),
  CONSTRAINT app_form_sections_order_check CHECK (display_order > 0)
);
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
    AND NEW.submit_label IS NOT DISTINCT FROM OLD.submit_label
    AND NEW.published_by IS NOT DISTINCT FROM OLD.published_by
    AND NEW.published_at IS NOT DISTINCT FROM OLD.published_at
    AND NEW.retired_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'published and retired form versions are immutable';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER app_form_versions_lifecycle
BEFORE INSERT OR UPDATE OR DELETE ON app_form_versions
FOR EACH ROW EXECUTE FUNCTION protect_form_version_lifecycle();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION require_mutable_form_version(target_id uuid)
RETURNS void AS $$
DECLARE version_status text;
BEGIN
  SELECT status INTO version_status
  FROM app_form_versions
  WHERE id = target_id
  FOR UPDATE;
  IF version_status IS DISTINCT FROM 'DRAFT' THEN
    RAISE EXCEPTION 'only draft form versions are editable';
  END IF;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_immutable_form_child_mutation()
RETURNS trigger AS $$
DECLARE old_version_id uuid; new_version_id uuid;
BEGIN
  IF TG_OP <> 'INSERT' THEN old_version_id := OLD.form_version_id; END IF;
  IF TG_OP <> 'DELETE' THEN new_version_id := NEW.form_version_id; END IF;
  IF TG_OP <> 'INSERT' THEN
    PERFORM require_mutable_form_version(old_version_id);
  END IF;
  IF TG_OP <> 'DELETE' THEN
    PERFORM require_mutable_form_version(new_version_id);
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_immutable_form_option_mutation()
RETURNS trigger AS $$
DECLARE old_version_id uuid; new_version_id uuid;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    SELECT form_version_id INTO old_version_id
    FROM app_form_fields WHERE id = OLD.field_id;
    PERFORM require_mutable_form_version(old_version_id);
  END IF;
  IF TG_OP <> 'DELETE' THEN
    SELECT form_version_id INTO new_version_id
    FROM app_form_fields WHERE id = NEW.field_id;
    PERFORM require_mutable_form_version(new_version_id);
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER app_form_sections_mutability
BEFORE INSERT OR UPDATE OR DELETE ON app_form_sections
FOR EACH ROW EXECUTE FUNCTION prevent_immutable_form_child_mutation();
--> statement-breakpoint
CREATE TRIGGER app_form_fields_mutability
BEFORE INSERT OR UPDATE OR DELETE ON app_form_fields
FOR EACH ROW EXECUTE FUNCTION prevent_immutable_form_child_mutation();
--> statement-breakpoint
CREATE TRIGGER app_form_field_options_mutability
BEFORE INSERT OR UPDATE OR DELETE ON app_form_field_options
FOR EACH ROW EXECUTE FUNCTION prevent_immutable_form_option_mutation();
--> statement-breakpoint
INSERT INTO app_capabilities (code, description) VALUES
  ('workflow.form.read', 'Read workflow form definitions and versions'),
  ('workflow.form.create', 'Create workflow form definitions'),
  ('workflow.form.update', 'Update workflow form drafts'),
  ('workflow.form.publish', 'Publish workflow form versions'),
  ('workflow.form.retire', 'Retire workflow form versions'),
  ('workflow.task.assigned.read', 'Read workflow tasks assigned to the signed-in user'),
  ('workflow.task.assigned.process', 'Process workflow tasks assigned to the signed-in user')
ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;
--> statement-breakpoint
INSERT INTO app_role_capabilities (role_id, capability_id)
SELECT role_row.id, capability_row.id
FROM app_roles role_row
CROSS JOIN app_capabilities capability_row
WHERE role_row.code = 'system_administrator'
  AND capability_row.code IN (
    'workflow.form.read',
    'workflow.form.create',
    'workflow.form.update',
    'workflow.form.publish',
    'workflow.form.retire'
  )
ON CONFLICT (role_id, capability_id) DO NOTHING;
--> statement-breakpoint
INSERT INTO app_role_capabilities (role_id, capability_id)
SELECT role_row.id, capability_row.id
FROM app_roles role_row
CROSS JOIN app_capabilities capability_row
WHERE role_row.code IN (
    'programme_officer',
    'sector_specialist',
    'finance_officer',
    'approval_panel_member',
    'system_administrator'
  )
  AND capability_row.code = 'workflow.task.assigned.read'
ON CONFLICT (role_id, capability_id) DO NOTHING;
--> statement-breakpoint
INSERT INTO app_role_capabilities (role_id, capability_id)
SELECT role_row.id, capability_row.id
FROM app_roles role_row
CROSS JOIN app_capabilities capability_row
WHERE role_row.code IN ('programme_officer', 'system_administrator')
  AND capability_row.code = 'workflow.task.assigned.process'
ON CONFLICT (role_id, capability_id) DO NOTHING;
--> statement-breakpoint
INSERT INTO app_role_capabilities (role_id, capability_id)
SELECT role_row.id, capability_row.id
FROM app_roles role_row
CROSS JOIN app_capabilities capability_row
WHERE role_row.code = 'programme_officer'
  AND capability_row.code = 'workflow.form.read'
ON CONFLICT (role_id, capability_id) DO NOTHING;
--> statement-breakpoint
DELETE FROM app_capabilities
WHERE code IN ('form.read', 'form.create', 'form.update', 'form.publish', 'form.retire');
