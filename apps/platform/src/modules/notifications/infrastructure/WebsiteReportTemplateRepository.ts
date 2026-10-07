import "server-only";
import { sql } from "drizzle-orm";
import type { NotificationOccurrenceTransaction } from "./NotificationOccurrenceRepository";
import type { NotificationTemplateContent } from "../application/NotificationTemplateRenderer";

export async function pinWebsiteReportDeliveryTemplate(
  transaction: NotificationOccurrenceTransaction,
  occurrenceId: string,
) {
  const result = await transaction.execute<
    NotificationTemplateContent & { id: string }
  >(sql`
    SELECT version.id, version.html_template AS "htmlTemplate",
      version.plain_text_template AS "plainTextTemplate", version.subject_template AS "subjectTemplate"
    FROM app_notification_outbox occurrence
    JOIN app_notification_template_targets target ON target.event_id = occurrence.event_id
    JOIN app_notification_channels channel ON channel.id = target.channel_id AND channel.code = 'EMAIL'
    JOIN app_notification_template_versions version ON version.template_target_id = target.id AND version.status = 'PUBLISHED'
    WHERE occurrence.id = ${occurrenceId}::uuid AND target.is_enabled
    LIMIT 1
  `);
  const template = result.rows[0];
  if (!template)
    throw new Error("A published website report email template is required.");
  await transaction.execute(sql`
    UPDATE app_notification_deliveries SET template_version_id = ${template.id}::uuid
    WHERE outbox_id = ${occurrenceId}::uuid
  `);
  return template;
}
