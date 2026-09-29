ALTER TABLE app_notification_events
  ADD COLUMN rule_eligibility text NOT NULL DEFAULT 'CONFIGURABLE',
  ADD CONSTRAINT app_notification_events_rule_eligibility_check
    CHECK (rule_eligibility IN ('CONFIGURABLE', 'SYSTEM_ONLY'));
--> statement-breakpoint
ALTER TABLE app_notification_deliveries
  DROP CONSTRAINT app_notification_deliveries_recipient_check,
  ADD CONSTRAINT app_notification_deliveries_recipient_check
    CHECK (recipient_type IN (
      'APPLICATION_OWNER', 'ASSIGNED_USER', 'FUNDING_CALL_STAKEHOLDER',
      'SPECIFIC_USER', 'SPECIFIC_ROLE', 'ACCOUNT_HOLDER'
    ));
--> statement-breakpoint
CREATE TABLE app_auth_email_rate_limits (
  key_hash text PRIMARY KEY,
  window_started_at timestamptz NOT NULL,
  request_count integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX app_auth_email_rate_limits_window_idx
  ON app_auth_email_rate_limits (window_started_at);
--> statement-breakpoint
INSERT INTO app_notification_catalogs (
  id, catalog_key, display_name, description, sort_order, is_enabled
) VALUES (
  '00000000-0000-4000-8000-000000000404', 'AUTHENTICATION', 'Authentication',
  'Mandatory account verification and recovery emails.', 5, true
) ON CONFLICT (catalog_key) DO NOTHING;
--> statement-breakpoint
INSERT INTO app_notification_events (
  id, catalog_id, event_key, display_name, description, rule_eligibility
)
SELECT seed.id::uuid, catalog.id, seed.event_key, seed.display_name,
  seed.description, 'SYSTEM_ONLY'
FROM app_notification_catalogs catalog
CROSS JOIN (VALUES
  ('00000000-0000-4000-8000-000000000218', 'auth.email.verification',
    'Email verification', 'Confirm the email address belonging to an account.'),
  ('00000000-0000-4000-8000-000000000219', 'auth.password.reset',
    'Password reset', 'Send password recovery instructions to the account holder.')
) seed(id, event_key, display_name, description)
WHERE catalog.catalog_key = 'AUTHENTICATION'
ON CONFLICT (event_key) DO UPDATE SET rule_eligibility = 'SYSTEM_ONLY';
--> statement-breakpoint
INSERT INTO app_notification_template_targets (
  id, channel_id, scope, event_id, default_subject_template
)
SELECT seed.id::uuid, channel.id, 'EVENT', event.id, seed.subject
FROM app_notification_channels channel
CROSS JOIN (VALUES
  ('00000000-0000-4000-8000-000000000522', 'auth.email.verification',
    'Verify your email for {{platformName}}'),
  ('00000000-0000-4000-8000-000000000523', 'auth.password.reset',
    'Reset your password for {{platformName}}')
) seed(id, event_key, subject)
JOIN app_notification_events event ON event.event_key = seed.event_key
WHERE channel.code = 'EMAIL'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO app_notification_template_targets (
  id, channel_id, scope, catalog_id, default_subject_template
)
SELECT '00000000-0000-4000-8000-000000000524', channel.id, 'CATALOG', catalog.id,
  'Account action for {{platformName}}'
FROM app_notification_channels channel
JOIN app_notification_catalogs catalog ON catalog.catalog_key = 'AUTHENTICATION'
WHERE channel.code = 'EMAIL'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
CREATE FUNCTION app_enforce_notification_rule_eligibility() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM app_notification_events
    WHERE id = NEW.event_id AND rule_eligibility = 'SYSTEM_ONLY'
  ) THEN
    RAISE EXCEPTION 'System-only events cannot have notification rules';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER app_notification_rules_eligibility_guard
  BEFORE INSERT OR UPDATE ON app_notification_event_rules
  FOR EACH ROW EXECUTE FUNCTION app_enforce_notification_rule_eligibility();
--> statement-breakpoint
CREATE FUNCTION app_enforce_event_rule_eligibility() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.rule_eligibility = 'SYSTEM_ONLY' AND EXISTS (
    SELECT 1 FROM app_notification_event_rules WHERE event_id = NEW.id
  ) THEN
    RAISE EXCEPTION 'Remove notification rules before making an event system-only';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER app_notification_events_eligibility_guard
  BEFORE UPDATE OF rule_eligibility ON app_notification_events
  FOR EACH ROW EXECUTE FUNCTION app_enforce_event_rule_eligibility();
