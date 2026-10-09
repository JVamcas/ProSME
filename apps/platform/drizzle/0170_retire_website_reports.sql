-- Preserve historical reports, period cursors and desired enablement without a runtime adapter.
-- Stop the old reporting/notification workers before applying this migration.
DO $$
BEGIN
  IF to_regclass('public.app_reporting_runs') IS NOT NULL THEN
    LOCK TABLE app_reporting_runs, app_reporting_schedules IN ACCESS EXCLUSIVE MODE;
    IF EXISTS (SELECT 1 FROM app_reporting_runs WHERE lease_expires_at > now()) THEN
      RAISE EXCEPTION 'Reconcile active website report leases before retirement';
    END IF;
    IF EXISTS (
      SELECT 1 FROM app_notification_outbox
      WHERE event_key IN ('reporting.website.biweekly', 'reporting.website.monthly')
        AND status = 'PROCESSING'
    ) THEN
      RAISE EXCEPTION 'Reconcile active website notification claims before retirement';
    END IF;
    ALTER TABLE app_reporting_runs RENAME TO app_reporting_retired_website_runs;
    ALTER TABLE app_reporting_schedules RENAME TO app_reporting_retired_website_schedules;
    COMMENT ON TABLE app_reporting_retired_website_runs IS 'Historical evidence only; no runtime reader or worker.';
    COMMENT ON TABLE app_reporting_retired_website_schedules IS 'Period continuity inputs only; original desired enablement preserved.';
    REVOKE ALL ON app_reporting_retired_website_runs, app_reporting_retired_website_schedules FROM PUBLIC;
  END IF;
END;
$$;
--> statement-breakpoint
-- Historical event/template/outbox identities remain available for audit.
UPDATE app_notification_events SET is_enabled = false
WHERE event_key IN ('reporting.website.biweekly', 'reporting.website.monthly');
--> statement-breakpoint
DELETE FROM app_notification_event_rules
WHERE event_id IN (
  SELECT id FROM app_notification_events
  WHERE event_key IN ('reporting.website.biweekly', 'reporting.website.monthly')
);
--> statement-breakpoint
UPDATE app_notification_template_targets SET is_enabled = false
WHERE event_id IN (
  SELECT id FROM app_notification_events
  WHERE event_key IN ('reporting.website.biweekly', 'reporting.website.monthly')
);
--> statement-breakpoint
UPDATE app_notification_outbox
SET status = 'DEAD_LETTER', locked_at = NULL, locked_by = NULL,
  last_error_code = 'REPORT_IMPLEMENTATION_RETIRED',
  last_error_message = 'Legacy report generation retired; historical evidence retained.',
  processed_at = now(), updated_at = now()
WHERE event_key IN ('reporting.website.biweekly', 'reporting.website.monthly')
  AND status IN ('PENDING', 'PARTIALLY_SENT');
--> statement-breakpoint
UPDATE app_notification_deliveries delivery
SET status = 'DEAD_LETTER', last_error_code = 'REPORT_IMPLEMENTATION_RETIRED',
  last_error_message = 'Legacy report delivery retired; historical evidence retained.',
  updated_at = now()
FROM app_notification_outbox occurrence
WHERE delivery.outbox_id = occurrence.id
  AND occurrence.event_key IN ('reporting.website.biweekly', 'reporting.website.monthly')
  AND delivery.status IN ('PENDING', 'PROCESSING');
--> statement-breakpoint
DELETE FROM app_capabilities
WHERE code IN ('reporting.website-report.read.all', 'reporting.website-schedule.update.all');
