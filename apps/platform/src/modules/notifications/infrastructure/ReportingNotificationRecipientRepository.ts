import "server-only";
import { sql } from "drizzle-orm";
import { getDatabase } from "@/platform/database/client";

export async function reportingRecipientStillBound(input: {
  reportId: string;
  ruleId: string;
  eventKey: string;
  userId: string;
  email: string;
}) {
  const result = await getDatabase().execute<{ allowed: boolean }>(sql`
    SELECT EXISTS (
      SELECT 1 FROM app_notification_event_rules rule
      JOIN app_notification_events event ON event.id = rule.event_id
      JOIN app_notification_event_rule_recipients recipient ON recipient.rule_id = rule.id
      JOIN app_notification_event_rule_channels binding ON binding.rule_recipient_id = recipient.id
      JOIN app_notification_channels channel ON channel.id = binding.channel_id AND channel.code = 'EMAIL' AND channel.is_enabled
      JOIN app_users actor ON actor.id = ${input.userId}::uuid AND actor.status = 'active'
      WHERE rule.id = ${input.ruleId}::uuid AND rule.report_id = ${input.reportId}::uuid
        AND rule.is_enabled AND event.is_enabled AND event.event_key = ${input.eventKey}
        AND lower(actor.email) = lower(${input.email})
        AND (recipient.recipient_user_id = actor.id OR EXISTS (
          SELECT 1 FROM app_user_roles membership WHERE membership.user_id = actor.id
            AND membership.role_id = recipient.recipient_role_id
        ))
    ) AS allowed
  `);
  return result.rows[0]?.allowed === true;
}

export async function hasAuthorizedReportingAudience(
  reportId: string,
  requiredPermissions: string[],
) {
  const result = await getDatabase().execute<{ allowed: boolean }>(sql`
    SELECT EXISTS (
      SELECT 1 FROM app_notification_event_rules rule
      JOIN app_notification_events event ON event.id = rule.event_id AND event.is_enabled
      JOIN app_notification_event_rule_recipients recipient ON recipient.rule_id = rule.id
      JOIN app_notification_event_rule_channels binding ON binding.rule_recipient_id = recipient.id
      JOIN app_notification_channels channel ON channel.id = binding.channel_id AND channel.code = 'EMAIL' AND channel.is_enabled
      JOIN app_users actor ON actor.status = 'active' AND (actor.id = recipient.recipient_user_id OR EXISTS (
        SELECT 1 FROM app_user_roles membership WHERE membership.user_id = actor.id AND membership.role_id = recipient.recipient_role_id
      ))
      WHERE rule.report_id = ${reportId}::uuid AND rule.is_enabled AND event.event_key = 'reporting.generation.completed'
        AND NOT EXISTS (
          SELECT required.code FROM unnest(${sql.param(requiredPermissions)}::text[]) required(code)
          WHERE NOT EXISTS (SELECT 1 FROM app_user_roles membership
            JOIN app_role_capabilities grant_record ON grant_record.role_id = membership.role_id
            JOIN app_capabilities permission ON permission.id = grant_record.capability_id
            WHERE membership.user_id = actor.id AND permission.code = required.code)
        )
    ) AS allowed
  `);
  return result.rows[0]?.allowed === true;
}
