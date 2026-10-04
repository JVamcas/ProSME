DELETE FROM app_notification_event_rule_recipients recipient
USING app_notification_event_rules rule, app_notification_events event
WHERE recipient.rule_id = rule.id
  AND rule.event_id = event.id
  AND event.event_key = 'application.submitted'
  AND recipient.recipient_type IN ('ASSIGNED_USER', 'FUNDING_CALL_STAKEHOLDER');
