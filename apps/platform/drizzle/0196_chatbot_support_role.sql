-- Bootstrap an empty, administrator-managed support team once. Subsequent runs
-- preserve membership, edited permissions and notification configuration.
DO $$
DECLARE
  support_role_id uuid;
  case_event_id uuid;
  case_rule_id uuid;
  email_channel_id uuid;
  support_recipient_id uuid;
BEGIN
  INSERT INTO app_roles (code, name, description)
  VALUES (
    'chatbot_support',
    'Chatbot Support',
    'Review and assign chatbot follow-up cases, and resolve cases assigned to you.'
  )
  ON CONFLICT (code) DO NOTHING
  RETURNING id INTO support_role_id;

  -- The role already exists: do not restore grants or routing removed by staff.
  IF support_role_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO app_role_capabilities (role_id, capability_id)
  SELECT support_role_id, id
  FROM app_capabilities
  WHERE code IN (
    'chatbot.escalation.read.all',
    'chatbot.escalation.assign.all',
    'chatbot.escalation.resolve.assigned'
  )
  ON CONFLICT DO NOTHING;

  SELECT id INTO case_event_id
  FROM app_notification_events
  WHERE event_key = 'chatbot.case.created';
  IF case_event_id IS NULL THEN
    RAISE EXCEPTION 'The chatbot case event must exist before support role bootstrap.';
  END IF;

  INSERT INTO app_notification_event_rules (event_id, description)
  VALUES (case_event_id, 'Notify the Chatbot Support role of new follow-up cases.')
  ON CONFLICT DO NOTHING;

  SELECT id INTO case_rule_id
  FROM app_notification_event_rules
  WHERE event_id = case_event_id AND report_id IS NULL;

  -- Preserve any recipient audience already configured by administrators.
  IF EXISTS (
    SELECT 1 FROM app_notification_event_rule_recipients
    WHERE rule_id = case_rule_id
  ) THEN
    RETURN;
  END IF;

  INSERT INTO app_notification_channels (code, display_name, channel_type)
  VALUES ('EMAIL', 'Email', 'EMAIL')
  ON CONFLICT DO NOTHING;

  SELECT id INTO email_channel_id
  FROM app_notification_channels WHERE code = 'EMAIL';

  INSERT INTO app_notification_event_rule_recipients (
    rule_id, recipient_type, recipient_role_id, is_required
  )
  VALUES (case_rule_id, 'SPECIFIC_ROLE', support_role_id, false)
  RETURNING id INTO support_recipient_id;

  INSERT INTO app_notification_event_rule_channels (rule_recipient_id, channel_id)
  VALUES (support_recipient_id, email_channel_id);
END $$;
