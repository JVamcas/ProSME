CREATE TABLE IF NOT EXISTS app_reporting_datasets (
  key text NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  name text NOT NULL,
  definition jsonb NOT NULL CHECK (jsonb_typeof(definition) = 'object'),
  PRIMARY KEY (key, version)
);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION protect_reporting_dataset_version()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Reporting dataset versions are immutable; install a new version';
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS app_reporting_datasets_immutable ON app_reporting_datasets;
--> statement-breakpoint
CREATE TRIGGER app_reporting_datasets_immutable BEFORE UPDATE OR DELETE
ON app_reporting_datasets FOR EACH ROW EXECUTE FUNCTION protect_reporting_dataset_version();
--> statement-breakpoint
INSERT INTO app_capabilities(code, description) VALUES
  ('reporting.dataset.read.all', 'Read immutable system reporting dataset definitions; source grants are separate.'),
  ('reporting.query.execute.all', 'Execute validated reporting queries across independently authorized sources.')
ON CONFLICT (code) DO NOTHING;
--> statement-breakpoint
-- No credentials or production owner/recipient is provisioned by startup or this migration.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_reporting_reader') THEN
    CREATE ROLE app_reporting_reader NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'app_reporting_reader'
      AND (rolsuper OR rolcreaterole OR rolcreatedb OR rolbypassrls OR rolcanlogin OR rolinherit)
  ) THEN
    RAISE EXCEPTION 'Unsafe existing app_reporting_reader role';
  END IF;
  EXECUTE format('GRANT app_reporting_reader TO %I', current_user);
END;
$$;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO app_reporting_reader;
--> statement-breakpoint
-- Every security-barrier view checks the active actor and live PostgreSQL grants.
CREATE OR REPLACE FUNCTION app_reporting_dataset_authorized(dataset_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public AS $$
  SELECT dataset_key = current_setting('app.reporting_dataset', true)
    AND dataset_key IN ('website-analytics', 'application-data', 'workflow-operations')
    AND EXISTS (
      SELECT 1 FROM public.app_users actor
      WHERE actor.id = nullif(current_setting('app.reporting_actor', true), '')::uuid
        AND actor.status = 'active'
        AND NOT EXISTS (
          SELECT required.code FROM unnest(
            ARRAY['reporting.dataset.read.all', 'reporting.query.execute.all'] ||
            CASE dataset_key
              WHEN 'website-analytics' THEN ARRAY['reporting.website.read.all']
              WHEN 'application-data' THEN ARRAY['funding.application.all.read']
              WHEN 'workflow-operations' THEN ARRAY['funding.application.all.read', 'workflow.instance.all.read']
            END
          ) required(code)
          WHERE NOT EXISTS (
            SELECT 1 FROM public.app_user_roles membership
            JOIN public.app_role_capabilities grant_record ON grant_record.role_id = membership.role_id
            JOIN public.app_capabilities permission ON permission.id = grant_record.capability_id
            WHERE membership.user_id = actor.id AND permission.code = required.code
          )
        )
    )
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_reporting_dataset_authorized(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_reporting_dataset_authorized(text) TO app_reporting_reader;
