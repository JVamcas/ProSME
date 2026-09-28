ALTER TABLE app_notification_event_rule_recipients
  DROP CONSTRAINT app_notification_event_rule_recipients_type_check,
  DROP CONSTRAINT app_notification_event_rule_recipients_target_check;
--> statement-breakpoint
DROP INDEX app_notification_event_rule_recipients_dynamic_unique;
--> statement-breakpoint
ALTER TABLE app_notification_event_rule_recipients
  ADD CONSTRAINT app_notification_event_rule_recipients_type_check
  CHECK (recipient_type IN (
    'APPLICATION_OWNER', 'ASSIGNED_USER', 'FUNDING_CALL_STAKEHOLDER',
    'SPECIFIC_USER', 'SPECIFIC_ROLE'
  )),
  ADD CONSTRAINT app_notification_event_rule_recipients_target_check
  CHECK (
    (recipient_type IN (
      'APPLICATION_OWNER', 'ASSIGNED_USER', 'FUNDING_CALL_STAKEHOLDER'
    ) AND recipient_user_id IS NULL AND recipient_role_id IS NULL)
    OR (recipient_type = 'SPECIFIC_USER'
      AND recipient_user_id IS NOT NULL AND recipient_role_id IS NULL)
    OR (recipient_type = 'SPECIFIC_ROLE'
      AND recipient_user_id IS NULL AND recipient_role_id IS NOT NULL)
  );
--> statement-breakpoint
CREATE UNIQUE INDEX app_notification_event_rule_recipients_dynamic_unique
  ON app_notification_event_rule_recipients (rule_id, recipient_type)
  WHERE recipient_type IN (
    'APPLICATION_OWNER', 'ASSIGNED_USER', 'FUNDING_CALL_STAKEHOLDER'
  );
--> statement-breakpoint
ALTER TABLE app_notification_deliveries
  DROP CONSTRAINT app_notification_deliveries_recipient_check;
--> statement-breakpoint
ALTER TABLE app_notification_deliveries
  ADD CONSTRAINT app_notification_deliveries_recipient_check
  CHECK (recipient_type IN (
    'APPLICATION_OWNER', 'ASSIGNED_USER', 'FUNDING_CALL_STAKEHOLDER',
    'SPECIFIC_USER', 'SPECIFIC_ROLE'
  ));
--> statement-breakpoint
INSERT INTO app_notification_catalogs (
  id, catalog_key, display_name, description, sort_order, is_enabled
) VALUES (
  '00000000-0000-4000-8000-000000000403', 'FUNDING_CALLS',
  'Funding calls', 'Funding call governance and publication lifecycle events.',
  15, true
) ON CONFLICT (catalog_key) DO NOTHING;
--> statement-breakpoint
INSERT INTO app_notification_events (
  id, catalog_id, event_key, display_name, description, is_enabled
)
SELECT seed.id::uuid, catalog.id, seed.event_key, seed.display_name,
  seed.description, true
FROM app_notification_catalogs catalog
CROSS JOIN (VALUES
  ('00000000-0000-4000-8000-000000000207', 'funding-call.approval-requested', 'Funding call approval requested', 'A funding call was submitted for governance approval.'),
  ('00000000-0000-4000-8000-000000000208', 'funding-call.returned-for-amendment', 'Funding call returned for amendment', 'A funding call was returned for amendment.'),
  ('00000000-0000-4000-8000-000000000209', 'funding-call.approved', 'Funding call approved', 'A funding call was approved.'),
  ('00000000-0000-4000-8000-000000000210', 'funding-call.approval-request-withdrawn', 'Funding call approval request withdrawn', 'A pending funding call approval request was withdrawn.'),
  ('00000000-0000-4000-8000-000000000211', 'funding-call.published', 'Funding call published', 'An approved funding call was published.'),
  ('00000000-0000-4000-8000-000000000212', 'funding-call.opened', 'Funding call opened', 'A scheduled funding call became live.'),
  ('00000000-0000-4000-8000-000000000213', 'funding-call.suspended', 'Funding call suspended', 'A funding call was suspended.'),
  ('00000000-0000-4000-8000-000000000214', 'funding-call.resumed', 'Funding call resumed', 'A suspended funding call was resumed.'),
  ('00000000-0000-4000-8000-000000000215', 'funding-call.closed', 'Funding call closed', 'A funding call reached its closing boundary.'),
  ('00000000-0000-4000-8000-000000000216', 'funding-call.withdrawn', 'Funding call withdrawn', 'A published funding call was withdrawn.'),
  ('00000000-0000-4000-8000-000000000217', 'funding-call.archived', 'Funding call archived', 'A closed or withdrawn funding call was archived.')
) AS seed(id, event_key, display_name, description)
WHERE catalog.catalog_key = 'FUNDING_CALLS'
ON CONFLICT (event_key) DO NOTHING;
--> statement-breakpoint
INSERT INTO app_notification_event_rules (id, event_id, description, is_enabled)
SELECT gen_random_uuid(), event.id, event.description, true
FROM app_notification_events event
WHERE event.event_key LIKE 'funding-call.%'
ON CONFLICT (event_id) DO NOTHING;
--> statement-breakpoint
INSERT INTO app_notification_event_rule_recipients (
  id, rule_id, recipient_type, is_required
)
SELECT gen_random_uuid(), rule.id, 'FUNDING_CALL_STAKEHOLDER', true
FROM app_notification_event_rules rule
JOIN app_notification_events event ON event.id = rule.event_id
WHERE event.event_key IN (
  'funding-call.returned-for-amendment', 'funding-call.approved',
  'funding-call.published', 'funding-call.opened', 'funding-call.suspended',
  'funding-call.resumed', 'funding-call.closed', 'funding-call.withdrawn',
  'funding-call.archived'
)
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO app_notification_event_rule_recipients (
  id, rule_id, recipient_type, recipient_role_id, is_required
)
SELECT gen_random_uuid(), rule.id, 'SPECIFIC_ROLE', role.id, true
FROM app_notification_event_rules rule
JOIN app_notification_events event ON event.id = rule.event_id
JOIN app_roles role ON true
JOIN app_role_capabilities role_grant ON role_grant.role_id = role.id
JOIN app_capabilities capability ON capability.id = role_grant.capability_id
WHERE event.event_key IN (
  'funding-call.approval-requested',
  'funding-call.approval-request-withdrawn'
)
  AND capability.code = 'funding.call.approve.all'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO app_notification_event_rule_channels (rule_recipient_id, channel_id)
SELECT recipient.id, channel.id
FROM app_notification_event_rule_recipients recipient
JOIN app_notification_event_rules rule ON rule.id = recipient.rule_id
JOIN app_notification_events event ON event.id = rule.event_id
JOIN app_notification_channels channel ON channel.code = 'EMAIL'
WHERE event.event_key LIKE 'funding-call.%'
  AND recipient.recipient_type IN (
    'FUNDING_CALL_STAKEHOLDER', 'SPECIFIC_ROLE'
  )
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO app_notification_template_targets (
  id, channel_id, scope, catalog_id, event_id, is_enabled,
  default_subject_template
)
SELECT '00000000-0000-4000-8000-000000000510', channel.id, 'CATALOG',
  catalog.id, NULL, true, 'Funding call {{fundingCallReference}} update'
FROM app_notification_channels channel
JOIN app_notification_catalogs catalog ON catalog.catalog_key = 'FUNDING_CALLS'
WHERE channel.code = 'EMAIL'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO app_notification_template_targets (
  id, channel_id, scope, catalog_id, event_id, is_enabled,
  default_subject_template
)
SELECT gen_random_uuid(), channel.id, 'EVENT', NULL, event.id, true,
  '{{fundingCallReference}}: ' || event.display_name
FROM app_notification_channels channel
CROSS JOIN app_notification_events event
WHERE channel.code = 'EMAIL' AND event.event_key LIKE 'funding-call.%'
ON CONFLICT DO NOTHING;
