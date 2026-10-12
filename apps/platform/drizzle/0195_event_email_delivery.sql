ALTER TABLE app_event_notification_intents ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE app_notification_deliveries DROP CONSTRAINT app_notification_deliveries_recipient_check;
ALTER TABLE app_notification_deliveries ADD CONSTRAINT app_notification_deliveries_recipient_check
 CHECK (recipient_type IN ('APPLICATION_OWNER', 'ASSIGNED_USER', 'FUNDING_CALL_STAKEHOLDER',
 'SPECIFIC_USER', 'SPECIFIC_ROLE', 'ACCOUNT_HOLDER', 'ACTION_ACTOR', 'EVENT_PARTICIPANT'));
--> statement-breakpoint
INSERT INTO app_notification_catalogs(catalog_key, display_name, description, sort_order, is_enabled)
 VALUES ('EVENTS', 'Events', 'Event-specific registration confirmations and reminders.', 6, true)
 ON CONFLICT (catalog_key) DO NOTHING;
INSERT INTO app_notification_events(catalog_id, event_key, display_name, description, rule_eligibility)
 SELECT c.id, seed.key, seed.label, seed.label, 'SYSTEM_ONLY'
 FROM app_notification_catalogs c CROSS JOIN (VALUES
 ('event.registration.confirmed', 'Event registration confirmation'),
 ('event.registration.reminder', 'Event registration reminder')) seed(key, label)
 WHERE c.catalog_key = 'EVENTS' ON CONFLICT (event_key) DO NOTHING;
INSERT INTO app_notification_template_targets(channel_id, scope, event_id, default_subject_template)
 SELECT c.id, 'EVENT', e.id, CASE WHEN e.event_key = 'event.registration.reminder'
 THEN 'Reminder: {{eventTitle}}' ELSE 'Registration confirmed: {{eventTitle}}' END
 FROM app_notification_events e CROSS JOIN app_notification_channels c
 WHERE e.event_key IN ('event.registration.confirmed', 'event.registration.reminder')
 AND c.code = 'EMAIL' ON CONFLICT DO NOTHING;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_reconcile_event_email_intents(target_event_id integer DEFAULT NULL)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(195, 1);

    WITH current AS (
      SELECT i.id, i.outbox_id,
        e._status = 'published' AND (CASE WHEN i.kind = 'REMINDER'
          THEN s.reminder_enabled AND e.starts_at > now()
          ELSE s.confirmation_enabled END) AS active,
        CASE WHEN i.kind = 'REMINDER'
          THEN e.starts_at - s.reminder_hours * interval '1 hour'
          ELSE i.due_at END AS due_at,
        jsonb_build_object('id', e.id, 'title', e.title, 'slug', e.slug,
          'startsAt', e.starts_at, 'endsAt', e.ends_at,
          'timezone', e.timezone, 'location', e.location) AS snapshot
      FROM app_event_notification_intents i
      JOIN cms_events e ON e.id = i.event_id
      JOIN app_event_registration_settings s ON s.event_id = e.id
      WHERE (target_event_id IS NULL OR e.id = target_event_id)
        AND NOT EXISTS (SELECT 1 FROM app_notification_deliveries d
          WHERE d.outbox_id = i.outbox_id AND d.status = 'SENT')
    ), stale AS (
      SELECT c.* FROM current c JOIN app_event_notification_intents i ON i.id = c.id
      WHERE (c.active IS NOT TRUE AND i.state <> 'CANCELLED') OR i.due_at IS DISTINCT FROM c.due_at
        OR i.published_snapshot IS DISTINCT FROM c.snapshot
        OR (i.state = 'CANCELLED' AND c.active)
    ), cancelled AS (
      UPDATE app_notification_deliveries d SET status = 'FAILED',
        last_error_code = 'EVENT_RECONCILED', updated_at = now()
      FROM stale WHERE d.outbox_id = stale.outbox_id AND d.status <> 'SENT'
      RETURNING d.outbox_id
    ), closed AS (
      UPDATE app_notification_outbox o SET status = 'FAILED', locked_by = NULL,
        locked_at = NULL, updated_at = now()
      FROM stale WHERE o.id = stale.outbox_id RETURNING o.id
    )
    UPDATE app_event_notification_intents i SET
      state = CASE WHEN stale.active THEN 'PENDING' ELSE 'CANCELLED' END,
      due_at = stale.due_at, published_snapshot = stale.snapshot, outbox_id = NULL,
      revision = i.revision + 1
    FROM stale WHERE i.id = stale.id
  ;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_reconcile_published_event_emails()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM app_reconcile_event_email_intents(NEW.id);
  RETURN NEW;
END;
$$;
DO $$ BEGIN
  IF to_regclass('cms_events') IS NOT NULL AND EXISTS (
    SELECT 1 FROM pg_attribute WHERE attrelid = to_regclass('cms_events') AND attname = 'timezone' AND NOT attisdropped
  ) THEN
    DROP TRIGGER IF EXISTS app_event_email_publication_reconcile ON cms_events;
    CREATE TRIGGER app_event_email_publication_reconcile
      AFTER UPDATE OF _status, starts_at, ends_at, timezone, title, slug, location
      ON cms_events FOR EACH ROW EXECUTE FUNCTION app_reconcile_published_event_emails();
  END IF;
END $$;
