import "server-only";
import { sql } from "drizzle-orm";
import {
  getDatabase,
  type DatabaseTransaction,
} from "@/platform/database/client";
import { permissionCodes } from "@/auth/authorization/permissions";
import type { ApplicationAppealEvent } from "../domain/NotificationApplicationAppealEvent";

export async function insertAppealAcknowledgement(
  transaction: DatabaseTransaction,
  context: ApplicationAppealEvent,
  recipient: { name: string; email: string },
) {
  const result = await transaction.execute(sql`
    WITH occurrence AS (
      INSERT INTO app_notification_outbox(event_id, event_key, aggregate_type, aggregate_id,
        occurrence_key, correlation_id, context)
      SELECT id, event_key, 'APPLICATION_APPEAL', ${context.appealId}::uuid,
        ${"appeal-ack:" + context.appealId}, ${context.appealId}, ${JSON.stringify(context)}::jsonb
      FROM app_notification_events WHERE event_key = 'application.appeal.acknowledged'
        AND rule_eligibility = 'SYSTEM_ONLY'
      RETURNING id
    )
    INSERT INTO app_notification_deliveries(outbox_id, channel_id, recipient_name,
      recipient_email, recipient_type, resolution_path)
    SELECT occurrence.id, channel.id, ${recipient.name}, ${recipient.email},
      'ACCOUNT_HOLDER', 'public-appeal-submitter'
    FROM occurrence CROSS JOIN app_notification_channels channel
    WHERE channel.code = 'EMAIL' RETURNING id
  `);
  if (!result.rows.length)
    throw new Error("Application appeal acknowledgement is not configured.");
}
export async function authorizedAppealRecipientIds(
  ids: string[],
  transaction?: DatabaseTransaction,
) {
  if (!ids.length) return new Set<string>();
  const result = await (transaction ?? getDatabase()).execute<{
    id: string;
  }>(sql`
    SELECT u.id FROM app_users u WHERE u.id = ANY(${sql.param(ids)}::uuid[])
      AND u.status = 'active' AND u.user_type = 'staff'
      AND EXISTS (SELECT 1 FROM app_user_roles membership
        JOIN app_role_capabilities grant_record ON grant_record.role_id = membership.role_id
        JOIN app_capabilities permission ON permission.id = grant_record.capability_id
        WHERE membership.user_id = u.id AND permission.code = ${permissionCodes.applicationAppealReadAll})
  `);
  return new Set(result.rows.map((row) => row.id));
}
export async function appealDeliveryAuthorized(
  userId: string,
  email: string,
  ruleId: string | null,
) {
  if (!ruleId) return false;
  const [allowed, current] = await Promise.all([
    authorizedAppealRecipientIds([userId]),
    getDatabase().execute(sql`
      SELECT EXISTS(SELECT 1 FROM app_users actor
        JOIN app_notification_event_rules rule ON rule.id = ${ruleId}::uuid AND rule.is_enabled
        JOIN app_notification_events event ON event.id = rule.event_id AND event.is_enabled
          AND event.event_key = 'application.appeal.received'
        JOIN app_notification_event_rule_recipients recipient ON recipient.rule_id = rule.id
        JOIN app_notification_event_rule_channels binding ON binding.rule_recipient_id = recipient.id
        JOIN app_notification_channels channel ON channel.id = binding.channel_id AND channel.is_enabled AND channel.code = 'EMAIL'
        WHERE actor.id = ${userId}::uuid AND lower(actor.email) = lower(${email})
          AND (recipient.recipient_user_id = actor.id OR EXISTS (
            SELECT 1 FROM app_user_roles membership WHERE membership.user_id = actor.id
              AND membership.role_id = recipient.recipient_role_id))) AS allowed
    `),
  ]);
  return allowed.has(userId) && current.rows[0]?.allowed === true;
}
