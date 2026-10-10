import "server-only";
import { sql } from "drizzle-orm";
import {
  getDatabase,
  type DatabaseTransaction,
} from "@/platform/database/client";
import { permissionCodes } from "@/auth/authorization/permissions";

export async function authorizedChatbotRecipientIds(
  caseId: string,
  ids: string[],
  transaction?: DatabaseTransaction,
) {
  if (!ids.length) return new Set<string>();
  const result = await (transaction ?? getDatabase()).execute(sql`
    SELECT actor.id FROM app_users actor JOIN app_chatbot_cases c ON c.id = ${caseId}::uuid AND c.expires_at > now()
    WHERE actor.id = ANY(${sql.param(ids)}::uuid[]) AND actor.status = 'active' AND actor.user_type = 'staff'
      AND EXISTS (SELECT 1 FROM app_user_roles membership
        JOIN app_role_capabilities grant_record ON grant_record.role_id = membership.role_id
        JOIN app_capabilities permission ON permission.id = grant_record.capability_id
        WHERE membership.user_id = actor.id AND
          (permission.code = ${permissionCodes.chatbotEscalationReadAll}
            OR (permission.code = ${permissionCodes.chatbotEscalationReadAssigned} AND c.assigned_to = actor.id)))
  `);
  return new Set(result.rows.map((row) => row.id as string));
}

export async function chatbotDeliveryRecipientAuthorized(
  caseId: string,
  userId: string,
  email: string,
  configuredIds: string[],
  ruleId: string | null,
) {
  if (configuredIds.length && !configuredIds.includes(userId)) return false;
  if (!ruleId) return false;
  const [allowed, current] = await Promise.all([
    authorizedChatbotRecipientIds(caseId, [userId]),
    getDatabase().execute(sql`
      SELECT EXISTS(SELECT 1 FROM app_users actor
        JOIN app_notification_event_rules rule ON rule.id = ${ruleId}::uuid AND rule.is_enabled
        JOIN app_notification_events event ON event.id = rule.event_id AND event.is_enabled AND event.event_key = 'chatbot.case.created'
        JOIN app_notification_event_rule_recipients recipient ON recipient.rule_id = rule.id
        JOIN app_notification_event_rule_channels binding ON binding.rule_recipient_id = recipient.id
        JOIN app_notification_channels channel ON channel.id = binding.channel_id AND channel.is_enabled AND channel.code = 'EMAIL'
        WHERE actor.id = ${userId}::uuid AND lower(actor.email) = lower(${email}) AND actor.status = 'active'
          AND (recipient.recipient_user_id = actor.id OR EXISTS(SELECT 1 FROM app_user_roles membership WHERE membership.user_id = actor.id AND membership.role_id = recipient.recipient_role_id))) AS allowed
    `),
  ]);
  return allowed.has(userId) && current.rows[0]?.allowed === true;
}
