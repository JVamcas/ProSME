import "server-only";
import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDatabase } from "@/platform/database/client";
import { websiteReportEmailTemplate } from "../domain/WebsiteReportEmailTemplate";

// Used after the normal notification seed, including installations bootstrapped after migration.
export async function seedWebsiteReportEmailTemplates() {
  const template = websiteReportEmailTemplate;
  const digest = createHash("sha256")
    .update(template.htmlTemplate)
    .digest("hex");
  await getDatabase().execute(sql`
    INSERT INTO app_notification_template_versions
      (template_target_id, version_number, source_file_name, media_type,
       subject_template, html_template, plain_text_template, content_sha256,
       status, uploaded_by_user_id, published_by_user_id, published_at)
    SELECT target.id, 1, 'website-report.html', 'text/html',
      ${template.subjectTemplate}, ${template.htmlTemplate}, ${template.plainTextTemplate},
      ${digest}, 'PUBLISHED', author.id, author.id, now()
    FROM app_notification_template_targets target
    JOIN app_notification_events event ON event.id = target.event_id
    CROSS JOIN LATERAL (
      SELECT app_users.id FROM app_users
      JOIN app_user_roles ON app_user_roles.user_id = app_users.id
      JOIN app_roles ON app_roles.id = app_user_roles.role_id
      WHERE app_users.status = 'active' AND app_roles.code = 'system_administrator'
      ORDER BY app_users.id LIMIT 1
    ) author
    WHERE event.event_key IN ('reporting.website.biweekly', 'reporting.website.monthly')
      AND NOT EXISTS (SELECT 1 FROM app_notification_template_versions existing
        WHERE existing.template_target_id = target.id)
    ON CONFLICT DO NOTHING
  `);
}
