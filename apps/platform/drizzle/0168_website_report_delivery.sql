CREATE TABLE IF NOT EXISTS app_reporting_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  frequency text NOT NULL UNIQUE CHECK (frequency IN ('BIWEEKLY', 'MONTHLY')),
  event_key text NOT NULL REFERENCES app_notification_events(event_key),
  timezone text,
  anchor_date date,
  next_period_start date,
  send_time text NOT NULL DEFAULT '09:00' CHECK (send_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  finalization_delay_hours integer NOT NULL DEFAULT 48 CHECK (finalization_delay_hours BETWEEN 24 AND 168),
  next_due_at timestamptz,
  enabled boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (NOT enabled OR (timezone IS NOT NULL AND anchor_date IS NOT NULL AND next_period_start IS NOT NULL AND next_due_at IS NOT NULL)),
  CHECK (frequency <> 'MONTHLY' OR anchor_date IS NULL OR extract(day FROM anchor_date) = 1),
  CHECK ((frequency = 'BIWEEKLY' AND event_key = 'reporting.website.biweekly') OR
         (frequency = 'MONTHLY' AND event_key = 'reporting.website.monthly'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS app_reporting_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES app_reporting_schedules(id),
  schedule_version integer NOT NULL,
  frequency text NOT NULL CHECK (frequency IN ('BIWEEKLY', 'MONTHLY')),
  start_date date NOT NULL,
  end_date date NOT NULL CHECK (end_date >= start_date),
  timezone text NOT NULL,
  contract_version text NOT NULL,
  scope text NOT NULL DEFAULT 'website-wide' CHECK (scope = 'website-wide'),
  configuration jsonb NOT NULL,
  due_at timestamptz NOT NULL,
  state text NOT NULL DEFAULT 'PENDING' CHECK (state IN ('PENDING', 'GENERATED')),
  snapshot jsonb,
  generated_at timestamptz,
  occurrence_id uuid REFERENCES app_notification_outbox(id),
  attempt_count integer NOT NULL DEFAULT 0,
  note text,
  retry_at timestamptz NOT NULL DEFAULT now(),
  lease_token uuid,
  lease_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (schedule_id, start_date, end_date),
  CHECK ((state = 'PENDING' AND snapshot IS NULL AND generated_at IS NULL AND occurrence_id IS NULL) OR
         (state = 'GENERATED' AND snapshot IS NOT NULL AND generated_at IS NOT NULL AND occurrence_id IS NOT NULL))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS app_reporting_runs_due_idx ON app_reporting_runs(state, retry_at, due_at);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION protect_generated_website_report() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.state = 'GENERATED' THEN
    RAISE EXCEPTION 'Generated website reports are immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS app_reporting_runs_immutable ON app_reporting_runs;
--> statement-breakpoint
CREATE TRIGGER app_reporting_runs_immutable BEFORE UPDATE OR DELETE ON app_reporting_runs
FOR EACH ROW EXECUTE FUNCTION protect_generated_website_report();
--> statement-breakpoint
INSERT INTO app_capabilities(code, description) VALUES
  ('reporting.website-report.read.all', 'Read all saved website report snapshots and delivery history.'),
  ('reporting.website-schedule.update.all', 'Configure bi-weekly and monthly website reporting periods and delivery times.')
ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;
--> statement-breakpoint
INSERT INTO app_role_capabilities(role_id, capability_id)
SELECT role.id, permission.id FROM app_roles role CROSS JOIN app_capabilities permission
WHERE role.code = 'system_administrator'
  AND permission.code IN ('reporting.website-report.read.all', 'reporting.website-schedule.update.all')
ON CONFLICT DO NOTHING;

--> statement-breakpoint
INSERT INTO app_notification_catalogs(id, catalog_key, display_name, description, sort_order)
VALUES ('00000000-0000-4000-8000-000000000405', 'REPORTING', 'Reporting', 'Scheduled website analytics reports.', 30)
ON CONFLICT (catalog_key) DO NOTHING;
--> statement-breakpoint
INSERT INTO app_notification_events(id, catalog_id, event_key, display_name, description, rule_eligibility)
SELECT seed.id::uuid, catalog.id, seed.key, seed.name, seed.description, 'CONFIGURABLE'
FROM (VALUES
 ('00000000-0000-4000-8000-000000000227', 'reporting.website.biweekly', 'Bi-weekly website report', 'A completed 14-day website analytics report is ready.'),
 ('00000000-0000-4000-8000-000000000228', 'reporting.website.monthly', 'Monthly website report', 'A completed calendar-month website analytics report is ready.')
) seed(id, key, name, description)
JOIN app_notification_catalogs catalog ON catalog.catalog_key = 'REPORTING'
ON CONFLICT (event_key) DO NOTHING;
--> statement-breakpoint
INSERT INTO app_notification_event_rules(event_id, description, is_enabled)
SELECT id, description, true FROM app_notification_events
WHERE event_key IN ('reporting.website.biweekly', 'reporting.website.monthly')
ON CONFLICT (event_id) DO NOTHING;
--> statement-breakpoint
INSERT INTO app_notification_template_targets(channel_id, scope, event_id, default_subject_template)
SELECT channel.id, 'EVENT', event.id, '{{reportFrequency}} website report: {{reportPeriod}}'
FROM app_notification_channels channel CROSS JOIN app_notification_events event
WHERE channel.code = 'EMAIL' AND event.event_key IN ('reporting.website.biweekly', 'reporting.website.monthly')
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO app_reporting_schedules(frequency, event_key) VALUES
 ('BIWEEKLY', 'reporting.website.biweekly'), ('MONTHLY', 'reporting.website.monthly')
ON CONFLICT (frequency) DO NOTHING;

--> statement-breakpoint
INSERT INTO app_notification_template_versions
 (template_target_id, version_number, source_file_name, media_type, subject_template,
  html_template, plain_text_template, content_sha256, status, uploaded_by_user_id, published_by_user_id, published_at)
SELECT target.id, 1, 'website-report.html', 'text/html', '{{reportFrequency}} website report: {{reportPeriod}}',
'<html><body style="background:#f6f4e2;color:#0a183b;font-family:Arial,sans-serif;padding:24px">
<div style="max-width:680px;margin:auto;background:#ffffff;padding:28px;border-top:6px solid #c9a24d">
<img src="{{brandingLogoUrl}}" alt="SME Fund Namibia" width="160" />
<h1>{{reportFrequency}} website analytics</h1><p>{{reportPeriod}}</p>
<p>Hello {{recipientName}},</p>
<pre style="white-space:pre-wrap;font-family:Arial,sans-serif;line-height:1.6">{{reportSummary}}</pre>
<h2>Sources and coverage</h2>
<pre style="white-space:pre-wrap;font-family:Arial,sans-serif;line-height:1.6">{{sourceNotes}}</pre>
<p><a href="{{reportUrl}}">View saved report</a></p></div></body></html>',
'{{reportFrequency}} website analytics
{{reportPeriod}}

Hello {{recipientName}},

{{reportSummary}}

Sources and coverage
{{sourceNotes}}

View saved report: {{reportUrl}}',
'7b323d7251ecced6bb594b9b47df82eeddd3e77af000ee5168d0192bc61e32b2', 'PUBLISHED', author.id, author.id, now()
FROM app_notification_template_targets target
JOIN app_notification_events event ON event.id = target.event_id
CROSS JOIN LATERAL (
 SELECT app_users.id FROM app_users JOIN app_user_roles ON app_user_roles.user_id = app_users.id
 JOIN app_roles ON app_roles.id = app_user_roles.role_id
 WHERE app_users.status = 'active' AND app_roles.code = 'system_administrator'
 ORDER BY app_users.id LIMIT 1
) author
WHERE event.event_key IN ('reporting.website.biweekly', 'reporting.website.monthly')
 AND NOT EXISTS (SELECT 1 FROM app_notification_template_versions existing WHERE existing.template_target_id = target.id)
ON CONFLICT DO NOTHING;
