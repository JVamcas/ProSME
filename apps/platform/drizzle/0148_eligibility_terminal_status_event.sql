-- Keep the persisted public-status constraint aligned with the shared status catalogue.
ALTER TABLE app_workflow_stage_definitions
  DROP CONSTRAINT IF EXISTS app_workflow_stages_public_status_check;
--> statement-breakpoint
ALTER TABLE app_workflow_stage_definitions
  ADD CONSTRAINT app_workflow_stages_public_status_check
  CHECK (applicant_status IN (
    'SUBMITTED', 'UNDER_REVIEW', 'ACTION_REQUIRED', 'OUTCOME_AVAILABLE',
    'CLOSED', 'WITHDRAWN', 'INELIGIBLE', 'REJECTED', 'REJECTED_INCOMPLETE'
  ));
--> statement-breakpoint
-- The catalogue and channel may not have been seeded on a fresh installation.
INSERT INTO app_notification_catalogs (
  id, catalog_key, display_name, description, sort_order, is_enabled
) VALUES (
  '00000000-0000-4000-8000-000000000401', 'APPLICATIONS', 'Applications',
  'Funding application lifecycle notification events.', 10, true
) ON CONFLICT (catalog_key) DO NOTHING;
--> statement-breakpoint
INSERT INTO app_notification_channels (
  id, code, display_name, channel_type, sort_order, is_enabled
) VALUES (
  '00000000-0000-4000-8000-000000000101', 'EMAIL', 'Email', 'EMAIL', 10, true
) ON CONFLICT (code) DO NOTHING;
--> statement-breakpoint
-- Idempotent registration; existing administrator configuration is preserved.
INSERT INTO app_notification_events (
  id, catalog_id, event_key, display_name, description, is_enabled, rule_eligibility
)
SELECT '00000000-0000-4000-8000-000000000220', catalog.id,
  'application.terminal-status-reached', 'Application reached terminal status',
  'An application reached a terminal status, including automatic eligibility failure.',
  true, 'CONFIGURABLE'
FROM app_notification_catalogs catalog
WHERE catalog.catalog_key = 'APPLICATIONS'
ON CONFLICT (event_key) DO NOTHING;
--> statement-breakpoint
-- Install the editable applicant/email preset only when this rule is first created.
-- Reapplying setup must not restore recipients or channels removed through the UI.
WITH created_rule AS (
  INSERT INTO app_notification_event_rules (id, event_id, description, is_enabled)
  SELECT '00000000-0000-4000-8000-000000000320', event.id, event.description, true
  FROM app_notification_events event
  WHERE event.event_key = 'application.terminal-status-reached'
  ON CONFLICT (event_id) DO NOTHING
  RETURNING id
), created_recipient AS (
  INSERT INTO app_notification_event_rule_recipients (
    id, rule_id, recipient_type, is_required
  )
  SELECT '00000000-0000-4000-8000-000000000720', rule.id, 'APPLICATION_OWNER', true
  FROM created_rule rule
  RETURNING id
)
INSERT INTO app_notification_event_rule_channels (id, rule_recipient_id, channel_id)
SELECT '00000000-0000-4000-8000-000000000620', recipient.id, channel.id
FROM created_recipient recipient
CROSS JOIN app_notification_channels channel
WHERE channel.code = 'EMAIL'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO app_notification_template_targets (
  id, channel_id, scope, event_id, default_subject_template, is_enabled
)
SELECT '00000000-0000-4000-8000-000000000525', channel.id, 'EVENT', event.id,
  'Application {{applicationReference}}: {{statusLabel}}', true
FROM app_notification_events event
CROSS JOIN app_notification_channels channel
WHERE event.event_key = 'application.terminal-status-reached' AND channel.code = 'EMAIL'
ON CONFLICT DO NOTHING;
