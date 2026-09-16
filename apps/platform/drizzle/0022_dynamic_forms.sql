CREATE TABLE IF NOT EXISTS app_form_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_form_definitions_code_unique UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS app_form_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_definition_id uuid NOT NULL REFERENCES app_form_definitions(id) ON DELETE RESTRICT,
  version_number integer NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT',
  instructions text,
  submit_label text NOT NULL DEFAULT 'Submit',
  row_version integer NOT NULL DEFAULT 1,
  created_by uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  published_by uuid REFERENCES app_users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  retired_at timestamptz,
  CONSTRAINT app_form_versions_definition_number_unique UNIQUE (form_definition_id, version_number),
  CONSTRAINT app_form_versions_status_check CHECK (status IN ('DRAFT', 'PUBLISHED', 'RETIRED')),
  CONSTRAINT app_form_versions_positive_check CHECK (version_number > 0),
  CONSTRAINT app_form_versions_row_version_check CHECK (row_version > 0)
);
CREATE INDEX IF NOT EXISTS app_form_versions_definition_status_idx ON app_form_versions(form_definition_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS app_form_versions_one_draft_unique
  ON app_form_versions(form_definition_id) WHERE status = 'DRAFT';

CREATE TABLE IF NOT EXISTS app_form_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_version_id uuid NOT NULL REFERENCES app_form_versions(id) ON DELETE RESTRICT,
  code text NOT NULL,
  label text NOT NULL,
  input_type text NOT NULL,
  data_type text NOT NULL,
  row_index integer NOT NULL,
  column_index integer NOT NULL,
  column_span integer NOT NULL DEFAULT 1,
  required boolean NOT NULL DEFAULT false,
  placeholder text,
  help_text text,
  validation jsonb,
  CONSTRAINT app_form_fields_version_code_unique UNIQUE (form_version_id, code),
  CONSTRAINT app_form_fields_version_position_unique UNIQUE (form_version_id, row_index, column_index),
  CONSTRAINT app_form_fields_row_positive_check CHECK (row_index > 0),
  CONSTRAINT app_form_fields_column_check CHECK (column_index IN (1, 2)),
  CONSTRAINT app_form_fields_span_check CHECK (column_span IN (1, 2)),
  CONSTRAINT app_form_fields_span_start_check CHECK (column_span <> 2 OR column_index = 1)
);
CREATE INDEX IF NOT EXISTS app_form_fields_version_order_idx ON app_form_fields(form_version_id, row_index, column_index);

CREATE TABLE IF NOT EXISTS app_form_field_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id uuid NOT NULL REFERENCES app_form_fields(id) ON DELETE RESTRICT,
  code text NOT NULL,
  label text NOT NULL,
  position integer NOT NULL,
  CONSTRAINT app_form_field_options_code_unique UNIQUE (field_id, code),
  CONSTRAINT app_form_field_options_position_unique UNIQUE (field_id, position),
  CONSTRAINT app_form_field_options_position_check CHECK (position > 0)
);

CREATE TABLE IF NOT EXISTS app_form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_instance_id uuid NOT NULL UNIQUE REFERENCES app_stage_task_instances(id) ON DELETE RESTRICT,
  form_version_id uuid NOT NULL REFERENCES app_form_versions(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'DRAFT',
  values jsonb NOT NULL DEFAULT '{}'::jsonb,
  row_version integer NOT NULL DEFAULT 1,
  created_by uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  updated_by uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT app_form_submissions_status_check CHECK (status IN ('DRAFT', 'COMPLETED')),
  CONSTRAINT app_form_submissions_row_version_check CHECK (row_version > 0)
);
CREATE INDEX IF NOT EXISTS app_form_submissions_version_idx ON app_form_submissions(form_version_id);

ALTER TABLE app_stage_task_definitions ADD COLUMN IF NOT EXISTS form_version_id uuid REFERENCES app_form_versions(id) ON DELETE RESTRICT;
ALTER TABLE app_stage_task_instances ADD COLUMN IF NOT EXISTS form_version_id uuid REFERENCES app_form_versions(id) ON DELETE RESTRICT;

INSERT INTO app_capabilities (code, description) VALUES
  ('form.read', 'Read operational form definitions and published versions'),
  ('form.create', 'Create operational form definitions'),
  ('form.update', 'Edit operational form drafts'),
  ('form.publish', 'Publish operational form versions'),
  ('form.retire', 'Retire operational form versions')
ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO app_role_capabilities (role_id, capability_id)
SELECT role_row.id, capability_row.id
FROM app_roles role_row
CROSS JOIN app_capabilities capability_row
WHERE role_row.code = 'system_administrator'
  AND capability_row.code IN ('form.read', 'form.create', 'form.update', 'form.publish', 'form.retire')
ON CONFLICT (role_id, capability_id) DO NOTHING;

INSERT INTO app_role_capabilities (role_id, capability_id)
SELECT role_row.id, capability_row.id
FROM app_roles role_row
CROSS JOIN app_capabilities capability_row
WHERE role_row.code = 'programme_officer'
  AND capability_row.code = 'form.read'
ON CONFLICT (role_id, capability_id) DO NOTHING;
