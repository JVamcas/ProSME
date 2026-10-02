CREATE TABLE IF NOT EXISTS app_workflow_deadline_executions (
  occurrence_key text PRIMARY KEY,
  workflow_instance_id uuid NOT NULL REFERENCES app_workflow_instances(id) ON DELETE RESTRICT,
  kind text NOT NULL,
  scheduled_for timestamptz NOT NULL,
  processed_at timestamptz,
  retry_at timestamptz,
  attempt_count integer NOT NULL DEFAULT 0,
  last_error_code text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS app_workflow_deadline_retry_idx ON app_workflow_deadline_executions(retry_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS app_workflow_tasks_deadline_idx
  ON app_workflow_tasks(due_at, stage_instance_id) WHERE status IN ('PENDING', 'IN_PROGRESS');
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS app_workflow_holds_review_idx
  ON app_workflow_holds(review_at) WHERE status = 'ACTIVE';
--> statement-breakpoint
ALTER TABLE app_workflow_escalations DROP CONSTRAINT IF EXISTS app_workflow_escalations_trigger_check;
--> statement-breakpoint
ALTER TABLE app_workflow_escalations ADD CONSTRAINT app_workflow_escalations_trigger_check
  CHECK (trigger IN ('MANUAL', 'SLA_BREACH', 'CONDITION', 'RFI_EXPIRY'));
--> statement-breakpoint
-- Reuse the disabled System principal. It has no Firebase credential, and this
-- grant is checked only after the internal processor's bearer authentication.
INSERT INTO app_users (id, display_name, email, status, user_type)
VALUES ('00000000-0000-4000-8000-000000000001', 'System', 'system@internal.sme-fund', 'disabled', 'staff')
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO app_capabilities (code, description)
VALUES ('workflow.deadline.all.process', 'Execute configured timed actions across active workflows through the authenticated system processor.')
ON CONFLICT (code) DO NOTHING;
--> statement-breakpoint
INSERT INTO app_roles (code, name, description)
VALUES ('SYSTEM_WORKFLOW_PROCESSOR', 'System workflow processor', 'Service-only permission for due workflow processing.')
ON CONFLICT (code) DO NOTHING;
--> statement-breakpoint
INSERT INTO app_role_capabilities (role_id, capability_id)
SELECT role.id, permission.id FROM app_roles role CROSS JOIN app_capabilities permission
WHERE role.code = 'SYSTEM_WORKFLOW_PROCESSOR' AND permission.code = 'workflow.deadline.all.process'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO app_user_roles (user_id, role_id)
SELECT principal.id, role.id FROM app_users principal CROSS JOIN app_roles role
WHERE principal.id = '00000000-0000-4000-8000-000000000001'
  AND principal.email = 'system@internal.sme-fund' AND principal.status = 'disabled'
  AND role.code = 'SYSTEM_WORKFLOW_PROCESSOR'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO app_notification_catalogs (id, catalog_key, display_name, description, sort_order, is_enabled)
VALUES ('00000000-0000-4000-8000-000000000402', 'WORKFLOW', 'Workflow', 'Workflow runtime notification events.', 20, true)
ON CONFLICT (catalog_key) DO NOTHING;
--> statement-breakpoint
INSERT INTO app_notification_channels (id, code, display_name, channel_type, sort_order, is_enabled)
VALUES ('00000000-0000-4000-8000-000000000101', 'EMAIL', 'Email', 'EMAIL', 10, true)
ON CONFLICT (code) DO NOTHING;
--> statement-breakpoint
-- Defaults are installed only for newly created rules. Reruns and seeds preserve
-- recipient/channel choices made in Notifications.
DO $$
DECLARE
  item record;
  registered_event_id uuid;
  created_rule_id uuid;
  recipient_id uuid;
BEGIN
  FOR item IN SELECT * FROM (VALUES
    (221, 'workflow.sla.breached', 'Workflow SLA breached',
      'A workflow task exceeded its effective SLA deadline.', 'ASSIGNED_USER'),
    (222, 'workflow.information-request.reminder', 'Information request reminder',
      'An open information request reached a configured reminder day.', 'APPLICATION_OWNER'),
    (223, 'workflow.hold.review-due', 'Workflow hold review due',
      'A held stage reached its review date; the hold remains active.', 'ASSIGNED_USER'),
    (224, 'workflow.deferral.resumed', 'Workflow deferral resumed',
      'A date-based deferral resumed its workflow stage.', 'ASSIGNED_USER')
  ) AS events(number, key, name, description, recipient_type)
  LOOP
    INSERT INTO app_notification_events (id, catalog_id, event_key, display_name, description, is_enabled, rule_eligibility)
    SELECT ('00000000-0000-4000-8000-' || lpad(item.number::text, 12, '0'))::uuid,
      catalog.id, item.key, item.name, item.description, true, 'CONFIGURABLE'
    FROM app_notification_catalogs catalog WHERE catalog.catalog_key = 'WORKFLOW'
    ON CONFLICT (event_key) DO NOTHING;
    SELECT id INTO registered_event_id FROM app_notification_events WHERE event_key = item.key;
    created_rule_id := NULL;
    INSERT INTO app_notification_event_rules (id, event_id, description, is_enabled)
    VALUES (('00000000-0000-4000-8000-' || lpad((item.number + 100)::text, 12, '0'))::uuid,
      registered_event_id, item.description, true)
    ON CONFLICT (event_id) DO NOTHING RETURNING id INTO created_rule_id;
    IF created_rule_id IS NOT NULL THEN
      INSERT INTO app_notification_event_rule_recipients (id, rule_id, recipient_type, is_required)
      VALUES (('00000000-0000-4000-8000-' || lpad((item.number + 500)::text, 12, '0'))::uuid,
        created_rule_id, item.recipient_type, false) RETURNING id INTO recipient_id;
      INSERT INTO app_notification_event_rule_channels (id, rule_recipient_id, channel_id)
      SELECT ('00000000-0000-4000-8000-' || lpad((item.number + 400)::text, 12, '0'))::uuid,
        recipient_id, channel.id FROM app_notification_channels channel WHERE channel.code = 'EMAIL'
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;
