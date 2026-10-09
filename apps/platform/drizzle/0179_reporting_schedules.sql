CREATE TABLE IF NOT EXISTS app_reporting_report_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES app_reporting_reports(id),
  cadence text NOT NULL CHECK (cadence IN ('FOURTEEN_DAYS', 'MONTHLY')),
  timezone text NOT NULL,
  anchor date NOT NULL,
  send_time text NOT NULL CHECK (send_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  finalization_hours integer NOT NULL CHECK (finalization_hours BETWEEN 0 AND 168),
  enabled boolean NOT NULL DEFAULT false,
  row_version integer NOT NULL DEFAULT 1,
  cursor date NOT NULL,
  next_due_at timestamptz NOT NULL,
  pending_run_id uuid REFERENCES app_reporting_report_runs(id),
  lease_token uuid,
  lease_until timestamptz,
  error text,
  CHECK (cadence <> 'MONTHLY' OR extract(day FROM anchor) = 1)
);
--> statement-breakpoint
ALTER TABLE app_reporting_report_runs DROP CONSTRAINT IF EXISTS app_reporting_report_runs_trigger_check;
ALTER TABLE app_reporting_report_runs ADD CONSTRAINT app_reporting_report_runs_trigger_check CHECK (trigger IN ('USER', 'SYSTEM'));
--> statement-breakpoint
ALTER TABLE app_reporting_report_runs ADD COLUMN IF NOT EXISTS schedule_id uuid REFERENCES app_reporting_report_schedules(id);
ALTER TABLE app_reporting_report_runs ADD COLUMN IF NOT EXISTS schedule_version integer;
ALTER TABLE app_reporting_report_runs ADD COLUMN IF NOT EXISTS period jsonb;
ALTER TABLE app_reporting_report_runs ADD COLUMN IF NOT EXISTS retry_of uuid REFERENCES app_reporting_report_runs(id);
ALTER TABLE app_reporting_report_runs ADD COLUMN IF NOT EXISTS source_deadline timestamptz NOT NULL DEFAULT now() + interval '24 hours';
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS app_reporting_schedule_period_unique ON app_reporting_report_runs(schedule_id, (period->>'startDate')) WHERE retry_of IS NULL;
CREATE INDEX IF NOT EXISTS app_reporting_schedules_due ON app_reporting_report_schedules(next_due_at) WHERE enabled;
--> statement-breakpoint
INSERT INTO app_capabilities(code, description)
VALUES ('reporting.schedule.update.all', 'Update schedules for all authorized reports.'),
       ('reporting.delivery.update.all', 'Update event delivery for all authorized reports.')
ON CONFLICT (code) DO NOTHING;

--> statement-breakpoint
ALTER TABLE app_reporting_report_runs ADD COLUMN IF NOT EXISTS source_coverage jsonb;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION protect_reporting_run_inputs()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'SUCCEEDED' OR (OLD.status = 'FAILED' AND NEW IS DISTINCT FROM OLD) THEN
    RAISE EXCEPTION 'Terminal reporting runs are immutable';
  END IF;
  IF ROW(NEW.report_id, NEW.report_name, NEW.report_version, NEW.template_id,
    NEW.template_version, NEW.definition, NEW.actor_id, NEW.trigger, NEW.idempotency_key,
    NEW.request_hash, NEW.values, NEW.format, NEW.run_at, NEW.timezone, NEW.website_scope,
    NEW.schedule_id, NEW.schedule_version, NEW.period, NEW.retry_of, NEW.source_deadline)
    IS DISTINCT FROM ROW(OLD.report_id, OLD.report_name, OLD.report_version, OLD.template_id,
    OLD.template_version, OLD.definition, OLD.actor_id, OLD.trigger, OLD.idempotency_key,
    OLD.request_hash, OLD.values, OLD.format, OLD.run_at, OLD.timezone, OLD.website_scope,
    OLD.schedule_id, OLD.schedule_version, OLD.period, OLD.retry_of, OLD.source_deadline) THEN
    RAISE EXCEPTION 'Reporting run inputs are immutable';
  END IF;
  RETURN NEW;
END;
$$;
