import "server-only";
import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import {
  getDatabase,
  type DatabaseTransaction,
} from "@/platform/database/client";
import { reportingEventKeys } from "../domain/NotificationReportingEvent";
import { reportingEmailTemplates } from "../domain/ReportingNotificationTemplates";

export async function ensureReportNotificationRules(
  transaction: DatabaseTransaction,
  reportId: string,
) {
  await transaction.execute(sql`
    INSERT INTO app_notification_event_rules(event_id, report_id, description, is_enabled)
    SELECT id, ${reportId}::uuid, description, false FROM app_notification_events
    WHERE event_key = ANY(${sql.param([...reportingEventKeys])}::text[])
    ON CONFLICT DO NOTHING
  `);
}
export async function seedReportingNotificationTemplates(actorId: string) {
  return getDatabase().transaction(async (transaction) => {
    await transaction.execute(sql`
      INSERT INTO app_notification_channels(code, channel_type, display_name, sort_order, is_enabled)
      VALUES ('EMAIL', 'EMAIL', 'Email', 10, true) ON CONFLICT DO NOTHING
    `);
    for (const key of reportingEventKeys) {
      const template = reportingEmailTemplates[key];
      await transaction.execute(sql`
        INSERT INTO app_notification_template_targets(channel_id, scope, event_id, default_subject_template)
        SELECT channel.id, 'EVENT', event.id, ${template.subject}
        FROM app_notification_events event CROSS JOIN app_notification_channels channel
        WHERE event.event_key = ${key} AND channel.code = 'EMAIL' ON CONFLICT DO NOTHING
      `);
      await transaction.execute(sql`
        INSERT INTO app_notification_template_versions(template_target_id, version_number,
          source_file_name, media_type, subject_template, html_template, plain_text_template,
          content_sha256, status, uploaded_by_user_id, published_by_user_id, published_at)
        SELECT target.id, 1, ${key + ".html"}, 'text/html', ${template.subject}, ${template.html},
          ${template.plainText}, ${createHash("sha256").update(template.html).digest("hex")},
          'PUBLISHED', ${actorId}::uuid, ${actorId}::uuid, now()
        FROM app_notification_template_targets target JOIN app_notification_events event ON event.id = target.event_id
        WHERE event.event_key = ${key} AND target.scope = 'EVENT'
          AND NOT EXISTS (SELECT 1 FROM app_notification_template_versions version WHERE version.template_target_id = target.id)
        ON CONFLICT DO NOTHING
      `);
    }
    await transaction.execute(sql`
      INSERT INTO app_notification_event_rules(event_id, report_id, description, is_enabled)
      SELECT event.id, report.id, event.description, false
      FROM app_reporting_reports report CROSS JOIN app_notification_events event
      WHERE event.event_key = ANY(${sql.param([...reportingEventKeys])}::text[])
      ON CONFLICT DO NOTHING
    `);
  });
}
