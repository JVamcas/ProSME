-- Preserve existing version numbers already recorded by report runs. Earlier
-- configurations were not retained, so only the current configuration is seeded.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'app_reporting_reports'
      AND column_name = 'report_version'
  ) THEN
    ALTER TABLE app_reporting_reports
      ADD COLUMN report_version integer NOT NULL DEFAULT 1
      CHECK (report_version > 0);
    UPDATE app_reporting_reports SET report_version = row_version;
  END IF;
END;
$$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS app_reporting_report_versions (
  report_id uuid NOT NULL REFERENCES app_reporting_reports(id),
  version integer NOT NULL CHECK (version > 0),
  template_id uuid NOT NULL,
  template_version integer NOT NULL,
  defaults jsonb NOT NULL,
  format text NOT NULL CHECK (format IN ('XLSX', 'CSV')),
  created_by uuid NOT NULL REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (report_id, version),
  FOREIGN KEY (template_id, template_version)
    REFERENCES app_reporting_template_versions(template_id, version)
);
--> statement-breakpoint
INSERT INTO app_reporting_report_versions (
  report_id, version, template_id, template_version, defaults, format,
  created_by, created_at
)
SELECT id, report_version, template_id, template_version, defaults, format,
  updated_by, updated_at FROM app_reporting_reports
ON CONFLICT (report_id, version) DO NOTHING;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION assign_reporting_configuration_version()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.report_version := 1;
  ELSIF ROW(NEW.template_id, NEW.template_version, NEW.defaults, NEW.format)
    IS DISTINCT FROM ROW(OLD.template_id, OLD.template_version, OLD.defaults, OLD.format) THEN
    NEW.report_version := OLD.report_version + 1;
  ELSE
    NEW.report_version := OLD.report_version;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION snapshot_reporting_configuration_version()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.report_version = OLD.report_version THEN
      RETURN NEW;
    END IF;
  END IF;
  INSERT INTO app_reporting_report_versions (
    report_id, version, template_id, template_version, defaults, format, created_by
  ) VALUES (
    NEW.id, NEW.report_version, NEW.template_id, NEW.template_version,
    NEW.defaults, NEW.format, NEW.updated_by
  );
  RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS app_reporting_assign_configuration_version ON app_reporting_reports;
CREATE TRIGGER app_reporting_assign_configuration_version BEFORE INSERT OR UPDATE
ON app_reporting_reports FOR EACH ROW EXECUTE FUNCTION assign_reporting_configuration_version();
--> statement-breakpoint
DROP TRIGGER IF EXISTS app_reporting_snapshot_configuration_version ON app_reporting_reports;
CREATE TRIGGER app_reporting_snapshot_configuration_version AFTER INSERT OR UPDATE
ON app_reporting_reports FOR EACH ROW EXECUTE FUNCTION snapshot_reporting_configuration_version();
--> statement-breakpoint
DROP TRIGGER IF EXISTS app_reporting_report_versions_immutable ON app_reporting_report_versions;
CREATE TRIGGER app_reporting_report_versions_immutable BEFORE UPDATE OR DELETE
ON app_reporting_report_versions FOR EACH ROW EXECUTE FUNCTION protect_reporting_published_record();
