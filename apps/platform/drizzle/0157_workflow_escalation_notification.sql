-- Idempotent registration; existing administrator configuration is preserved.
INSERT INTO app_notification_events (
  id, catalog_id, event_key, display_name, description, is_enabled, rule_eligibility
)
SELECT '00000000-0000-4000-8000-000000000225', catalog.id,
  'workflow.task.escalated', 'Workflow task escalated',
  'A workflow task was escalated and transferred to a new assignee.',
  true, 'CONFIGURABLE'
FROM app_notification_catalogs catalog
WHERE catalog.catalog_key = 'WORKFLOW'
ON CONFLICT (event_key) DO NOTHING;
--> statement-breakpoint
-- Install the editable new-assignee/email preset only when this rule is first created.
-- Reapplying setup must not restore recipients or channels removed through the UI.
WITH created_rule AS (
  INSERT INTO app_notification_event_rules (id, event_id, description, is_enabled)
  SELECT '00000000-0000-4000-8000-000000000325', event.id, event.description, true
  FROM app_notification_events event
  WHERE event.event_key = 'workflow.task.escalated'
  ON CONFLICT (event_id) DO NOTHING
  RETURNING id
), created_recipient AS (
  INSERT INTO app_notification_event_rule_recipients (
    id, rule_id, recipient_type, is_required
  )
  SELECT '00000000-0000-4000-8000-000000000725', rule.id, 'ASSIGNED_USER', true
  FROM created_rule rule
  RETURNING id
)
INSERT INTO app_notification_event_rule_channels (id, rule_recipient_id, channel_id)
SELECT '00000000-0000-4000-8000-000000000625', recipient.id, channel.id
FROM created_recipient recipient
CROSS JOIN app_notification_channels channel
WHERE channel.code = 'EMAIL'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO app_notification_template_targets (
  id, channel_id, scope, event_id, default_subject_template, is_enabled
)
SELECT '00000000-0000-4000-8000-000000000530', channel.id, 'EVENT', event.id,
  'Task escalated to you for application {{applicationReference}}', true
FROM app_notification_events event
CROSS JOIN app_notification_channels channel
WHERE event.event_key = 'workflow.task.escalated' AND channel.code = 'EMAIL'
ON CONFLICT DO NOTHING;
