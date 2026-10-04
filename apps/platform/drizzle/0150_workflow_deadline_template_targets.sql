-- Add event-specific template slots without changing staff-edited configuration.
-- Email content is maintained as importable HTML under the notification module.
INSERT INTO app_notification_template_targets (
  id, channel_id, scope, event_id, default_subject_template, is_enabled
)
SELECT preset.id, channel.id, 'EVENT', event.id, preset.subject, true
FROM (VALUES
  ('00000000-0000-4000-8000-000000000526'::uuid, 'workflow.sla.breached', 'Review overdue for application {{applicationReference}}'),
  ('00000000-0000-4000-8000-000000000527'::uuid, 'workflow.information-request.reminder', 'Reminder: information needed for application {{applicationReference}}'),
  ('00000000-0000-4000-8000-000000000528'::uuid, 'workflow.hold.review-due', 'Time to review application {{applicationReference}} on hold'),
  ('00000000-0000-4000-8000-000000000529'::uuid, 'workflow.deferral.resumed', 'Review resumed for application {{applicationReference}}')
) AS preset(id, event_key, subject)
JOIN app_notification_events event ON event.event_key = preset.event_key
CROSS JOIN app_notification_channels channel
WHERE channel.code = 'EMAIL'
ON CONFLICT DO NOTHING;
