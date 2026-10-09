ALTER TABLE app_notification_event_rules ADD COLUMN IF NOT EXISTS report_id uuid REFERENCES app_reporting_reports(id);
--> statement-breakpoint
DROP INDEX IF EXISTS app_notification_event_rules_event_unique;
CREATE UNIQUE INDEX IF NOT EXISTS app_notification_event_rules_event_unique ON app_notification_event_rules(event_id) WHERE report_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS app_notification_event_rules_report_unique ON app_notification_event_rules(event_id, report_id) WHERE report_id IS NOT NULL;
--> statement-breakpoint
ALTER TABLE app_notification_outbox ADD COLUMN IF NOT EXISTS report_id uuid REFERENCES app_reporting_reports(id);
ALTER TABLE app_notification_outbox ADD COLUMN IF NOT EXISTS rule_id uuid REFERENCES app_notification_event_rules(id);
--> statement-breakpoint
INSERT INTO app_notification_catalogs(catalog_key, display_name, description, sort_order)
VALUES ('REPORTING', 'Reporting', 'Report generation and delivery lifecycle.', 30) ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO app_notification_events(event_key, catalog_id, display_name, description, rule_eligibility)
SELECT item.key, catalog.id, item.name, item.description, 'CONFIGURABLE'
FROM (VALUES
  ('reporting.generation.started', 'Report generation started', 'A report run started; no attachment.'),
  ('reporting.generation.completed', 'Report generation completed', 'A report run saved its output file.'),
  ('reporting.generation.failed', 'Report generation failed', 'A report run failed; attach its saved sanitized error file.')
) item(key, name, description)
JOIN app_notification_catalogs catalog ON catalog.catalog_key = 'REPORTING'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
-- Reporting events deliberately have no global rule or default audience.
CREATE INDEX IF NOT EXISTS app_notification_outbox_report_history ON app_notification_outbox(report_id, created_at DESC);

--> statement-breakpoint
INSERT INTO app_notification_event_rules(event_id, report_id, description, is_enabled)
SELECT event.id, report.id, event.description, false
FROM app_notification_events event CROSS JOIN app_reporting_reports report
WHERE event.event_key LIKE 'reporting.generation.%' ON CONFLICT DO NOTHING;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_guard_notification_outbox_identity()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF ROW(NEW.event_id, NEW.event_key, NEW.aggregate_type, NEW.aggregate_id,
    NEW.occurrence_key, NEW.correlation_id, NEW.context, NEW.created_at, NEW.report_id, NEW.rule_id)
    IS DISTINCT FROM ROW(OLD.event_id, OLD.event_key, OLD.aggregate_type, OLD.aggregate_id,
    OLD.occurrence_key, OLD.correlation_id, OLD.context, OLD.created_at, OLD.report_id, OLD.rule_id) THEN
    RAISE EXCEPTION 'notification occurrence identity and context are immutable';
  END IF;
  RETURN NEW;
END;
$$;
