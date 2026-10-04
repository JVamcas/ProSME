ALTER TABLE app_workflow_holds DROP CONSTRAINT IF EXISTS app_workflow_holds_scope_check;
--> statement-breakpoint
ALTER TABLE app_workflow_holds ADD CONSTRAINT app_workflow_holds_scope_check CHECK (scope IN ('TASK', 'STAGE', 'APPLICATION'));
--> statement-breakpoint
ALTER TABLE app_workflow_holds DROP CONSTRAINT IF EXISTS app_workflow_holds_task_scope_check;
--> statement-breakpoint
ALTER TABLE app_workflow_holds ADD CONSTRAINT app_workflow_holds_task_scope_check CHECK (scope <> 'TASK' OR task_id IS NOT NULL);
--> statement-breakpoint
DROP INDEX IF EXISTS app_workflow_holds_active_stage_unique;
--> statement-breakpoint
CREATE UNIQUE INDEX app_workflow_holds_active_stage_unique ON app_workflow_holds(stage_instance_id) WHERE status = 'ACTIVE' AND scope = 'STAGE';
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS app_workflow_holds_active_task_unique ON app_workflow_holds(task_id) WHERE status = 'ACTIVE' AND scope = 'TASK';
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS app_workflow_holds_active_application_unique ON app_workflow_holds(workflow_instance_id) WHERE status = 'ACTIVE' AND scope = 'APPLICATION';
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_validate_workflow_hold_context() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM app_workflow_stage_instances stage
    WHERE stage.id = NEW.stage_instance_id AND stage.workflow_instance_id = NEW.workflow_instance_id)
    OR (NEW.task_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM app_workflow_tasks task
      WHERE task.id = NEW.task_id AND task.stage_instance_id = NEW.stage_instance_id)) THEN
    RAISE EXCEPTION 'Hold context does not match its workflow, stage and task';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS app_workflow_holds_context_guard ON app_workflow_holds;
--> statement-breakpoint
CREATE TRIGGER app_workflow_holds_context_guard BEFORE INSERT OR UPDATE OF workflow_instance_id, stage_instance_id, task_id, scope
ON app_workflow_holds FOR EACH ROW EXECUTE FUNCTION app_validate_workflow_hold_context();
--> statement-breakpoint
INSERT INTO app_capabilities (code, description) VALUES
  ('workflow.task.assigned.hold', 'Suspend only a workflow task assigned to the signed-in user.'),
  ('workflow.task.assigned.resume', 'End a task-scoped hold on a workflow task assigned to the signed-in user.'),
  ('workflow.stage.all.hold', 'Suspend all unfinished work in any active workflow stage.'),
  ('workflow.stage.all.resume', 'End a stage-scoped hold in any active workflow.'),
  ('workflow.instance.all.hold', 'Suspend processing across any active application workflow.'),
  ('workflow.instance.all.resume', 'End an application-scoped hold in any active workflow.')
ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;
--> statement-breakpoint
-- Existing processors retain only the narrow assigned-task hold controls.
-- Wider authority is explicitly granted to the existing full administrator role.
INSERT INTO app_role_capabilities (role_id, capability_id)
SELECT DISTINCT existing.role_id, permission.id
FROM app_role_capabilities existing
JOIN app_capabilities processor ON processor.id = existing.capability_id
JOIN app_roles role ON role.id = existing.role_id
CROSS JOIN app_capabilities permission
WHERE (processor.code = 'workflow.task.assigned.process'
    AND permission.code IN ('workflow.task.assigned.hold', 'workflow.task.assigned.resume'))
  OR (role.code = 'system_administrator' AND permission.code IN
    ('workflow.task.assigned.hold', 'workflow.task.assigned.resume', 'workflow.stage.all.hold',
     'workflow.stage.all.resume', 'workflow.instance.all.hold', 'workflow.instance.all.resume'))
ON CONFLICT (role_id, capability_id) DO NOTHING;
--> statement-breakpoint
DROP INDEX IF EXISTS app_notification_event_rule_recipients_dynamic_unique;
--> statement-breakpoint
CREATE UNIQUE INDEX app_notification_event_rule_recipients_dynamic_unique
ON app_notification_event_rule_recipients(rule_id, recipient_type)
WHERE recipient_type IN ('APPLICATION_OWNER', 'ASSIGNED_USER', 'FUNDING_CALL_STAKEHOLDER', 'ACTION_ACTOR');
--> statement-breakpoint
ALTER TABLE app_notification_event_rule_recipients DROP CONSTRAINT IF EXISTS app_notification_event_rule_recipients_type_check;
--> statement-breakpoint
ALTER TABLE app_notification_event_rule_recipients ADD CONSTRAINT app_notification_event_rule_recipients_type_check CHECK (recipient_type IN ('APPLICATION_OWNER', 'ASSIGNED_USER', 'FUNDING_CALL_STAKEHOLDER', 'ACTION_ACTOR', 'SPECIFIC_USER', 'SPECIFIC_ROLE'));
--> statement-breakpoint
ALTER TABLE app_notification_event_rule_recipients DROP CONSTRAINT IF EXISTS app_notification_event_rule_recipients_target_check;
--> statement-breakpoint
ALTER TABLE app_notification_event_rule_recipients ADD CONSTRAINT app_notification_event_rule_recipients_target_check CHECK ((recipient_type IN ('APPLICATION_OWNER', 'ASSIGNED_USER', 'FUNDING_CALL_STAKEHOLDER', 'ACTION_ACTOR') AND recipient_user_id IS NULL AND recipient_role_id IS NULL) OR (recipient_type = 'SPECIFIC_USER' AND recipient_user_id IS NOT NULL AND recipient_role_id IS NULL) OR (recipient_type = 'SPECIFIC_ROLE' AND recipient_user_id IS NULL AND recipient_role_id IS NOT NULL));
--> statement-breakpoint
ALTER TABLE app_notification_deliveries DROP CONSTRAINT IF EXISTS app_notification_deliveries_recipient_check;
--> statement-breakpoint
ALTER TABLE app_notification_deliveries ADD CONSTRAINT app_notification_deliveries_recipient_check CHECK (recipient_type IN ('APPLICATION_OWNER', 'ASSIGNED_USER', 'FUNDING_CALL_STAKEHOLDER', 'ACTION_ACTOR', 'SPECIFIC_USER', 'SPECIFIC_ROLE', 'ACCOUNT_HOLDER'));
--> statement-breakpoint
-- Idempotent registration; existing administrator configuration is preserved.
INSERT INTO app_notification_events (
  id, catalog_id, event_key, display_name, description, is_enabled, rule_eligibility
)
SELECT '00000000-0000-4000-8000-000000000226', catalog.id,
  'workflow.hold.resumed', 'Workflow hold automatically resumed',
  'A hold ended automatically on its review date; notify the person who placed it.',
  true, 'CONFIGURABLE'
FROM app_notification_catalogs catalog
WHERE catalog.catalog_key = 'WORKFLOW'
ON CONFLICT (event_key) DO NOTHING;
--> statement-breakpoint
-- Install the editable hold-initiator/email preset only when this rule is first created.
-- Reapplying setup must not restore recipients or channels removed through the UI.
WITH created_rule AS (
  INSERT INTO app_notification_event_rules (id, event_id, description, is_enabled)
  SELECT '00000000-0000-4000-8000-000000000326', event.id, event.description, true
  FROM app_notification_events event
  WHERE event.event_key = 'workflow.hold.resumed'
  ON CONFLICT (event_id) DO NOTHING
  RETURNING id
), created_recipient AS (
  INSERT INTO app_notification_event_rule_recipients (
    id, rule_id, recipient_type, is_required
  )
  SELECT '00000000-0000-4000-8000-000000000726', rule.id, 'ACTION_ACTOR', true
  FROM created_rule rule
  RETURNING id
)
INSERT INTO app_notification_event_rule_channels (id, rule_recipient_id, channel_id)
SELECT '00000000-0000-4000-8000-000000000626', recipient.id, channel.id
FROM created_recipient recipient
CROSS JOIN app_notification_channels channel
WHERE channel.code = 'EMAIL'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO app_notification_template_targets (
  id, channel_id, scope, event_id, default_subject_template, is_enabled
)
SELECT '00000000-0000-4000-8000-000000000531', channel.id, 'EVENT', event.id,
  'Your hold ended for application {{applicationReference}}', true
FROM app_notification_events event
CROSS JOIN app_notification_channels channel
WHERE event.event_key = 'workflow.hold.resumed' AND channel.code = 'EMAIL'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
-- Publish the initial system-owned template only for a new, empty target.
-- Existing uploaded or published administrator content is preserved on reruns.
INSERT INTO app_notification_template_versions (
  template_target_id, version_number, source_file_name, media_type,
  subject_template, html_template, plain_text_template, content_sha256,
  status, uploaded_by_user_id, published_by_user_id, published_at
)
SELECT target.id, 1, 'workflow-hold-resumed.html', 'text/html',
  target.default_subject_template, $hold_html$<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
  <title>Your hold has ended | {{platformName}}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">
    The hold you placed has ended automatically on its review date.
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f4f6f8;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e4e8ee;border-radius:14px;overflow:hidden;">
          <tr>
            <td style="height:5px;background:#f28c28;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <tr>
            <td style="padding:28px 32px 22px;border-bottom:1px solid #edf0f3;">
              <img
                src="{{brandingLogoUrl}}"
                width="156"
                alt="{{platformName}}"
                style="display:block;width:156px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;"
              >
            </td>
          </tr>

          <tr>
            <td style="padding:38px 32px 12px;">
              <p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;font-weight:700;letter-spacing:1.1px;text-transform:uppercase;color:#f28c28;">
                Application update
              </p>
              <h1 style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:28px;line-height:36px;font-weight:700;color:#0a183b;">
                Your hold has ended
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding:12px 32px 6px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#39465a;">
              <p style="margin:0 0 18px;">Hello {{recipientName}},</p>
              <p style="margin:0 0 18px;">The hold you placed on application <strong>{{applicationReference}}</strong> under {{fundingOpportunityTitle}} ended automatically on its review date.</p>
              <p style="margin:0 0 18px;">{{resumptionStatus}}</p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin:0 0 24px;background:#f8fafc;border:1px solid #e8edf2;border-radius:10px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#596579;"><strong style="color:#0a183b;">Scope:</strong> {{holdScope}}</p>
                    <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#596579;"><strong style="color:#0a183b;">Stage:</strong> {{stageName}}</p>
                    <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#596579;"><strong style="color:#0a183b;">Review date:</strong> {{scheduledFor}}</p>
                    <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#596579;"><strong style="color:#0a183b;">Resumed:</strong> {{occurredAt}}</p>
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#596579;"><strong style="color:#0a183b;">Funding opportunity:</strong> {{fundingOpportunityTitle}}</p>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;">
                <tr>
                  <td bgcolor="#0A183B" style="border-radius:8px;">
                    <a href="{{workQueueUrl}}" target="_blank" style="display:inline-block;background-color:#0a183b;padding:13px 22px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:20px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">
                      Open work queue
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:13px;line-height:20px;color:#687386;">
                If the button does not work, copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 24px;font-size:13px;line-height:20px;word-break:break-all;">
                <a href="{{workQueueUrl}}" target="_blank" style="color:#0a4f8f;text-decoration:underline;">{{workQueueUrl}}</a>
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:22px 32px 28px;background:#0a183b;font-family:Arial,Helvetica,sans-serif;color:#dce3ec;">
              <p style="margin:0 0 8px;font-size:13px;line-height:20px;font-weight:700;color:#ffffff;">{{platformName}}</p>
              <p style="margin:0 0 12px;font-size:12px;line-height:19px;">Supporting Namibian SMEs through accessible funding and development opportunities.</p>
              <p style="margin:0;font-size:11px;line-height:18px;color:#aeb9c9;">
                This is an automated message. Please do not reply to this email.<br>
                &copy; 2026 SME Fund. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
$hold_html$,
  $hold_text$Hello {{recipientName}},
The hold you placed on application {{applicationReference}} ended automatically.
Scope: {{holdScope}}
Stage: {{stageName}}
Review date: {{scheduledFor}}
Ended: {{occurredAt}}
{{resumptionStatus}}
Open your work queue: {{workQueueUrl}}
{{platformName}}$hold_text$, '866aa4132d897f53d6aa00006fa365707874c65c6cf408156f3d003e33347758',
  'PUBLISHED', '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001', now()
FROM app_notification_template_targets target
JOIN app_notification_events event ON event.id = target.event_id
WHERE event.event_key = 'workflow.hold.resumed'
  AND NOT EXISTS (SELECT 1 FROM app_notification_template_versions version
    WHERE version.template_target_id = target.id)
ON CONFLICT DO NOTHING;
