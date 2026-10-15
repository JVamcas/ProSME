-- Public appeal intake and staff queue. Reapplying preserves grants and edited templates/rules.
CREATE TABLE IF NOT EXISTS app_application_appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appeal_number integer GENERATED ALWAYS AS IDENTITY NOT NULL UNIQUE,
  application_id uuid NOT NULL REFERENCES app_applications(id) ON DELETE RESTRICT,
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL DEFAULT '',
  grounds text NOT NULL,
  details text NOT NULL,
  consent boolean NOT NULL CONSTRAINT app_application_appeals_consent CHECK(consent = true),
  state text NOT NULL DEFAULT 'NEW' CONSTRAINT app_application_appeals_state CHECK(state IN ('NEW','IN_PROGRESS','RESOLVED')),
  assigned_to uuid REFERENCES app_users(id),
  resolution_note text,
  resolved_at timestamptz,
  row_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_application_appeals_resolution CHECK(state <> 'RESOLVED' OR (resolution_note IS NOT NULL AND length(trim(resolution_note)) > 0 AND resolved_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS app_application_appeals_queue ON app_application_appeals(updated_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS app_application_appeals_application ON app_application_appeals(application_id);
CREATE TABLE IF NOT EXISTS app_application_appeal_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appeal_id uuid NOT NULL REFERENCES app_application_appeals(id),
  actor_id uuid REFERENCES app_users(id),
  action text NOT NULL,
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
INSERT INTO app_capabilities(code, description) VALUES
  ('application.appeal.read.all', 'Read all application appeals and submitter contact details.'),
  ('application.appeal.assign.all', 'Assign all application appeals to authorized active staff.'),
  ('application.appeal.resolve.all', 'Resolve all application appeals with a resolution note.')
ON CONFLICT (code) DO NOTHING;
-- The platform administrator retains access; other roles receive explicit grants through role administration.
INSERT INTO app_role_capabilities(role_id, capability_id)
SELECT role.id, permission.id FROM app_roles role CROSS JOIN app_capabilities permission
WHERE role.code = 'system_administrator' AND permission.code IN (
  'application.appeal.read.all', 'application.appeal.assign.all', 'application.appeal.resolve.all'
) ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO app_notification_events(id, catalog_id, event_key, display_name, description, rule_eligibility, is_enabled)
SELECT '00000000-0000-4000-8000-000000000240', id, 'application.appeal.received', 'New Application Appeal Received',
  'New Application Appeal Received.', 'CONFIGURABLE', true FROM app_notification_catalogs WHERE catalog_key = 'APPLICATIONS'
ON CONFLICT DO NOTHING;
INSERT INTO app_notification_event_rules(id, event_id, description, is_enabled)
SELECT '00000000-0000-4000-8000-000000000340', id, 'Subscribe staff to new application appeals.', true
FROM app_notification_events WHERE event_key = 'application.appeal.received' ON CONFLICT DO NOTHING;
INSERT INTO app_notification_template_targets(id, channel_id, scope, event_id, default_subject_template, is_enabled)
SELECT '00000000-0000-4000-8000-000000000540', channel.id, 'EVENT', event.id, 'New application appeal {{appealReference}} received', true
FROM app_notification_events event CROSS JOIN app_notification_channels channel
WHERE event.event_key = 'application.appeal.received' AND channel.code = 'EMAIL' ON CONFLICT DO NOTHING;
INSERT INTO app_notification_template_versions(template_target_id, version_number, source_file_name, media_type,
  subject_template, html_template, plain_text_template, content_sha256, status,
  uploaded_by_user_id, published_by_user_id, published_at)
SELECT target.id, 1, 'application-appeal-received.html', 'text/html', 'New application appeal {{appealReference}} received',
  $appeal_html$<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
  <title>New application appeal received | {{platformName}}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">
    A new application appeal is ready for staff review.
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
                Application appeal
              </p>
              <h1 style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:28px;line-height:36px;font-weight:700;color:#0a183b;">
                New application appeal received
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding:12px 32px 6px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#39465a;">
              <p style="margin:0 0 18px;">Hello {{recipientName}},</p>
              <p style="margin:0 0 18px;">
                A new appeal has been received for application {{applicationReference}}.
              </p>
              <p style="margin:0 0 18px;">
                Open the appeal to read its grounds and details, view the linked application, and assign it to a staff member.
              </p>
              <p style="margin:0 0 18px;">
                Once the appeal has been addressed, add a resolution note and resolve it.
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin:0 0 24px;background:#f8fafc;border:1px solid #e8edf2;border-radius:10px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#596579;"><strong style="color:#0a183b;">Appeal reference:</strong> {{appealReference}}</p>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;">
                <tr>
                  <td bgcolor="#0A183B" style="border-radius:8px;">
                    <a href="{{appealUrl}}" target="_blank" style="display:inline-block;background-color:#0a183b;padding:13px 22px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:20px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">
                      Review appeal
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:13px;line-height:20px;color:#687386;">
                If the button does not work, copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 24px;font-size:13px;line-height:20px;word-break:break-all;">
                <a href="{{appealUrl}}" target="_blank" style="color:#0a4f8f;text-decoration:underline;">{{appealUrl}}</a>
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
$appeal_html$, $appeal_text$Hello {{recipientName}},
A new appeal {{appealReference}} has been received for application {{applicationReference}}.
Review appeal: {{appealUrl}}
{{platformName}}$appeal_text$,
  '77da1a252b7013ace577ec87c255cb1fb2c37cef1aef230520f02ab1061e0296', 'PUBLISHED',
  '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', now()
FROM app_notification_template_targets target JOIN app_notification_events event ON event.id = target.event_id
WHERE event.event_key = 'application.appeal.received' AND target.scope = 'EVENT'
  AND NOT EXISTS(SELECT 1 FROM app_notification_template_versions version WHERE version.template_target_id = target.id)
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO app_notification_events(id, catalog_id, event_key, display_name, description, rule_eligibility, is_enabled)
SELECT '00000000-0000-4000-8000-000000000241', id, 'application.appeal.acknowledged', 'Application appeal acknowledgement',
  'Application appeal acknowledgement.', 'SYSTEM_ONLY', true FROM app_notification_catalogs WHERE catalog_key = 'APPLICATIONS'
ON CONFLICT DO NOTHING;
INSERT INTO app_notification_template_targets(id, channel_id, scope, event_id, default_subject_template, is_enabled)
SELECT '00000000-0000-4000-8000-000000000541', channel.id, 'EVENT', event.id, 'Appeal received: {{appealReference}}', true
FROM app_notification_events event CROSS JOIN app_notification_channels channel
WHERE event.event_key = 'application.appeal.acknowledged' AND channel.code = 'EMAIL' ON CONFLICT DO NOTHING;
INSERT INTO app_notification_template_versions(template_target_id, version_number, source_file_name, media_type,
  subject_template, html_template, plain_text_template, content_sha256, status,
  uploaded_by_user_id, published_by_user_id, published_at)
SELECT target.id, 1, 'application-appeal-acknowledged.html', 'text/html', 'Appeal received: {{appealReference}}',
  $appeal_html$<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
  <title>Your appeal has been received | {{platformName}}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">
    We have received your application appeal.
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
                Application appeal
              </p>
              <h1 style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:28px;line-height:36px;font-weight:700;color:#0a183b;">
                Your appeal has been received
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding:12px 32px 6px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#39465a;">
              <p style="margin:0 0 18px;">Hello {{recipientName}},</p>
              <p style="margin:0 0 18px;">
                We have received your appeal for application {{applicationReference}}.
              </p>
              <p style="margin:0 0 18px;">
                Our team will review the grounds and details you submitted and contact you using the information you provided.
              </p>
              <p style="margin:0 0 18px;">
                Please keep your appeal reference for future correspondence.
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin:0 0 24px;background:#f8fafc;border:1px solid #e8edf2;border-radius:10px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#596579;"><strong style="color:#0a183b;">Appeal reference:</strong> {{appealReference}}</p>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;">
                <tr>
                  <td bgcolor="#0A183B" style="border-radius:8px;">
                    <a href="{{contactUrl}}" target="_blank" style="display:inline-block;background-color:#0a183b;padding:13px 22px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:20px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">
                      Contact us
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:13px;line-height:20px;color:#687386;">
                If the button does not work, copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 24px;font-size:13px;line-height:20px;word-break:break-all;">
                <a href="{{contactUrl}}" target="_blank" style="color:#0a4f8f;text-decoration:underline;">{{contactUrl}}</a>
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
$appeal_html$, $appeal_text$Hello {{recipientName}},
We have received appeal {{appealReference}} for application {{applicationReference}}. Our team will review it and contact you.
Contact us: {{contactUrl}}
{{platformName}}$appeal_text$,
  'f3edcec447243b35341925c0fc9916f571a420cc3b0880c803e7523effaf70e8', 'PUBLISHED',
  '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', now()
FROM app_notification_template_targets target JOIN app_notification_events event ON event.id = target.event_id
WHERE event.event_key = 'application.appeal.acknowledged' AND target.scope = 'EVENT'
  AND NOT EXISTS(SELECT 1 FROM app_notification_template_versions version WHERE version.template_target_id = target.id)
ON CONFLICT DO NOTHING;
--> statement-breakpoint
