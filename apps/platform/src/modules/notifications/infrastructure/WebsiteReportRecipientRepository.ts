import "server-only";
import { sql, type SQL } from "drizzle-orm";
import { getDatabase } from "@/platform/database/client";
import { permissionCodes } from "@/auth/authorization/permissions";

export function websiteReportRecipientPermissionSql(userId: SQL) {
  return sql`EXISTS (
    SELECT 1 FROM app_user_roles access_role
    JOIN app_role_capabilities grant_entry ON grant_entry.role_id = access_role.role_id
    JOIN app_capabilities permission ON permission.id = grant_entry.capability_id
    WHERE access_role.user_id = ${userId}
      AND permission.code = ${permissionCodes.reportingWebsiteReportReadAll}
  )`;
}

export async function isCurrentWebsiteReportRecipient(input: {
  eventKey: string;
  userId: string;
  email: string;
}) {
  const result = await getDatabase().execute(sql`
    SELECT 1 FROM app_users recipient
    WHERE recipient.id = ${input.userId}::uuid AND recipient.status = 'active'
      AND lower(recipient.email) = lower(${input.email})
      AND ${websiteReportRecipientPermissionSql(sql`recipient.id`)}
      AND EXISTS (
        SELECT 1 FROM app_notification_events event
        JOIN app_notification_event_rules rule ON rule.event_id = event.id
        JOIN app_notification_event_rule_recipients binding ON binding.rule_id = rule.id
        JOIN app_notification_event_rule_channels channel_binding ON channel_binding.rule_recipient_id = binding.id
        JOIN app_notification_channels channel ON channel.id = channel_binding.channel_id
        WHERE event.event_key = ${input.eventKey}
          AND event.is_enabled AND rule.is_enabled AND channel.is_enabled AND channel.code = 'EMAIL'
          AND ((binding.recipient_type = 'SPECIFIC_USER' AND binding.recipient_user_id = recipient.id)
            OR (binding.recipient_type = 'SPECIFIC_ROLE' AND EXISTS (
              SELECT 1 FROM app_user_roles membership
              WHERE membership.user_id = recipient.id AND membership.role_id = binding.recipient_role_id
            )))
      )
    LIMIT 1
  `);
  return result.rows.length > 0;
}
