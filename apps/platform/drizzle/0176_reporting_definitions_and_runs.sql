CREATE TABLE IF NOT EXISTS app_reporting_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  definition jsonb NOT NULL,
  row_version integer NOT NULL DEFAULT 1 CHECK (row_version > 0),
  published_version integer,
  updated_by uuid NOT NULL REFERENCES app_users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS app_reporting_template_versions (
  template_id uuid NOT NULL REFERENCES app_reporting_templates(id),
  version integer NOT NULL CHECK (version > 0),
  definition jsonb NOT NULL,
  published_by uuid NOT NULL REFERENCES app_users(id),
  published_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (template_id, version)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS app_reporting_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  template_id uuid NOT NULL,
  template_version integer NOT NULL,
  defaults jsonb NOT NULL,
  format text NOT NULL CHECK (format IN ('XLSX', 'CSV')),
  owner_id uuid NOT NULL REFERENCES app_users(id),
  row_version integer NOT NULL DEFAULT 1 CHECK (row_version > 0),
  updated_by uuid NOT NULL REFERENCES app_users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (template_id, template_version)
    REFERENCES app_reporting_template_versions(template_id, version)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS app_reporting_report_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES app_reporting_reports(id),
  report_name text NOT NULL,
  report_version integer NOT NULL,
  template_id uuid NOT NULL,
  template_version integer NOT NULL,
  definition jsonb NOT NULL,
  actor_id uuid NOT NULL REFERENCES app_users(id),
  trigger text NOT NULL DEFAULT 'USER' CHECK (trigger = 'USER'),
  idempotency_key uuid NOT NULL,
  request_hash text NOT NULL,
  values jsonb NOT NULL,
  format text NOT NULL CHECK (format IN ('XLSX', 'CSV')),
  run_at timestamptz NOT NULL,
  timezone text NOT NULL,
  website_scope jsonb,
  status text NOT NULL DEFAULT 'QUEUED'
    CHECK (status IN ('QUEUED', 'PREPARING_SOURCE', 'RUNNING', 'SUCCEEDED', 'FAILED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz,
  rows integer CHECK (rows >= 0),
  error text,
  pending_output jsonb,
  lease_token uuid,
  lease_until timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (report_id, actor_id, idempotency_key),
  FOREIGN KEY (template_id, template_version)
    REFERENCES app_reporting_template_versions(template_id, version)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS app_reporting_runs_claim
  ON app_reporting_report_runs(available_at, created_at)
  WHERE status IN ('QUEUED', 'PREPARING_SOURCE', 'RUNNING');
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS app_reporting_runs_history
  ON app_reporting_report_runs(report_id, created_at DESC, id DESC);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS app_reporting_run_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES app_reporting_report_runs(id),
  kind text NOT NULL CHECK (kind IN ('OUTPUT', 'ERROR')),
  object_key text NOT NULL UNIQUE,
  filename text NOT NULL,
  content_type text NOT NULL,
  bytes integer NOT NULL CHECK (bytes >= 0 AND bytes <= 26214400),
  checksum text NOT NULL,
  UNIQUE (run_id, kind)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS app_reporting_run_events (
  run_id uuid NOT NULL REFERENCES app_reporting_report_runs(id),
  key text NOT NULL CHECK (key IN (
    'reporting.generation.started', 'reporting.generation.completed', 'reporting.generation.failed'
  )),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}',
  PRIMARY KEY (run_id, key)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS app_reporting_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES app_users(id),
  resource_id uuid NOT NULL,
  action text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'
);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION protect_reporting_published_record()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Published reporting records are immutable';
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS app_reporting_versions_immutable ON app_reporting_template_versions;
CREATE TRIGGER app_reporting_versions_immutable BEFORE UPDATE OR DELETE
ON app_reporting_template_versions FOR EACH ROW EXECUTE FUNCTION protect_reporting_published_record();
--> statement-breakpoint
DROP TRIGGER IF EXISTS app_reporting_events_immutable ON app_reporting_run_events;
CREATE TRIGGER app_reporting_events_immutable BEFORE UPDATE OR DELETE
ON app_reporting_run_events FOR EACH ROW EXECUTE FUNCTION protect_reporting_published_record();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION protect_reporting_run_inputs()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'SUCCEEDED' OR (OLD.status = 'FAILED' AND NEW IS DISTINCT FROM OLD) THEN
    RAISE EXCEPTION 'Terminal reporting runs are immutable';
  END IF;
  IF ROW(NEW.report_id, NEW.report_name, NEW.report_version, NEW.template_id,
    NEW.template_version, NEW.definition, NEW.actor_id, NEW.trigger, NEW.idempotency_key,
    NEW.request_hash, NEW.values, NEW.format, NEW.run_at, NEW.timezone, NEW.website_scope)
    IS DISTINCT FROM ROW(OLD.report_id, OLD.report_name, OLD.report_version, OLD.template_id,
    OLD.template_version, OLD.definition, OLD.actor_id, OLD.trigger, OLD.idempotency_key,
    OLD.request_hash, OLD.values, OLD.format, OLD.run_at, OLD.timezone, OLD.website_scope) THEN
    RAISE EXCEPTION 'Reporting run inputs are immutable';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS app_reporting_run_inputs_immutable ON app_reporting_report_runs;
CREATE TRIGGER app_reporting_run_inputs_immutable BEFORE UPDATE
ON app_reporting_report_runs FOR EACH ROW EXECUTE FUNCTION protect_reporting_run_inputs();
--> statement-breakpoint
INSERT INTO app_capabilities(code, description) VALUES
  ('reporting.template.read.all', 'Read all report templates; source grants remain separate.'),
  ('reporting.template.create.all', 'Create report templates; source grants remain separate.'),
  ('reporting.template.update.all', 'Update all report template drafts; source grants remain separate.'),
  ('reporting.template.publish.all', 'Publish immutable report template versions; source grants remain separate.'),
  ('reporting.report.read.all', 'Read all configured reports; source grants remain separate.'),
  ('reporting.report.create.all', 'Create configured reports; source grants remain separate.'),
  ('reporting.report.update.all', 'Update all configured reports; source grants remain separate.'),
  ('reporting.report.run.all', 'Run all configured reports; source grants remain separate.'),
  ('reporting.run.read.all', 'Read all report runs; source grants remain separate.'),
  ('reporting.run.download.all', 'Download all authorized report artifacts; source grants remain separate.')
ON CONFLICT (code) DO NOTHING;
