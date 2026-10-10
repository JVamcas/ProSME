import "server-only";
import { sql } from "drizzle-orm";
import {
  getDatabase,
  type DatabaseTransaction,
} from "@/platform/database/client";
import { permissionCodes } from "@/auth/authorization/permissions";
import type { ChatbotPolicy } from "../api/ChatbotKnowledgeSchemas";

export async function readStoredChatbotPolicy(
  transaction?: DatabaseTransaction,
) {
  const result = await (transaction ?? getDatabase()).execute(
    sql`SELECT policy FROM app_chatbot_operational_policy WHERE key = 'POLICY'`,
  );
  return result.rows[0]?.policy as ChatbotPolicy | undefined;
}

export async function storeChatbotPolicy(
  transaction: DatabaseTransaction,
  actorId: string,
  policy: ChatbotPolicy,
) {
  await transaction.execute(sql`
    INSERT INTO app_chatbot_operational_policy(key,policy,updated_by) VALUES ('POLICY',${JSON.stringify(policy)}::jsonb,${actorId}::uuid)
    ON CONFLICT(key) DO UPDATE SET policy = EXCLUDED.policy,updated_by = EXCLUDED.updated_by,updated_at = now()
  `);
  await transaction.execute(
    sql`INSERT INTO app_chatbot_policy_audit(actor_id,policy) VALUES (${actorId}::uuid,${JSON.stringify(policy)}::jsonb)`,
  );
  // Shorter policies immediately affect persisted data; extensions never restore expired records.
  await transaction.execute(
    sql`UPDATE app_chatbot_conversations SET expires_at = least(expires_at,created_at + ${policy.sessionMinutes} * interval '1 minute')`,
  );
  await transaction.execute(
    sql`UPDATE app_chatbot_cases SET expires_at = least(expires_at,created_at + ${policy.escalationDays} * interval '1 day'), contact_expires_at = least(contact_expires_at,created_at + ${policy.contactDays} * interval '1 day')`,
  );
}

export async function listChatbotAssignableStaff(
  transaction?: DatabaseTransaction,
) {
  const result = await (transaction ?? getDatabase()).execute(sql`
    SELECT u.id, u.display_name AS name, u.email FROM app_users u
    WHERE u.status = 'active' AND u.user_type = 'staff' AND EXISTS(
      SELECT 1 FROM app_user_roles membership JOIN app_role_capabilities grant_record ON grant_record.role_id = membership.role_id
      JOIN app_capabilities permission ON permission.id = grant_record.capability_id
      WHERE membership.user_id = u.id AND permission.code IN (${permissionCodes.chatbotEscalationReadAll},${permissionCodes.chatbotEscalationReadAssigned}))
    ORDER BY u.display_name,u.id LIMIT 501
  `);
  return result.rows as { id: string; name: string; email: string }[];
}

export async function chatbotAssigneeCanRead(
  id: string,
  transaction: DatabaseTransaction,
) {
  const result = await transaction.execute(sql`
    SELECT EXISTS(SELECT 1 FROM app_users u JOIN app_user_roles membership ON membership.user_id = u.id
      JOIN app_role_capabilities grant_record ON grant_record.role_id = membership.role_id
      JOIN app_capabilities permission ON permission.id = grant_record.capability_id
      WHERE u.id = ${id}::uuid AND u.status = 'active' AND u.user_type = 'staff'
        AND permission.code IN (${permissionCodes.chatbotEscalationReadAll},${permissionCodes.chatbotEscalationReadAssigned})) AS allowed
  `);
  return result.rows[0]?.allowed === true;
}

export async function purgeExpiredChatbotData(
  transaction: DatabaseTransaction,
  auditDays: number,
) {
  const contacts = await transaction.execute(
    sql`UPDATE app_chatbot_cases SET contact = NULL,contact_expires_at = NULL WHERE id IN(SELECT id FROM app_chatbot_cases WHERE contact_expires_at <= now() LIMIT 100 FOR UPDATE SKIP LOCKED) RETURNING id`,
  );
  const cases = await transaction.execute(
    sql`DELETE FROM app_chatbot_cases WHERE id IN(SELECT id FROM app_chatbot_cases WHERE expires_at <= now() LIMIT 100 FOR UPDATE SKIP LOCKED) RETURNING id`,
  );
  const conversations = await transaction.execute(
    sql`DELETE FROM app_chatbot_conversations WHERE id IN(SELECT id FROM app_chatbot_conversations WHERE expires_at <= now() LIMIT 100 FOR UPDATE SKIP LOCKED) RETURNING id`,
  );
  await transaction.execute(
    sql`DELETE FROM app_chatbot_rate_limits WHERE key_hash IN(SELECT key_hash FROM app_chatbot_rate_limits WHERE window_started_at < now() - interval '1 day' LIMIT 1000)`,
  );
  await transaction.execute(
    sql`DELETE FROM app_chatbot_case_audit WHERE id IN(SELECT id FROM app_chatbot_case_audit WHERE created_at <= now() - ${auditDays} * interval '1 day' LIMIT 1000)`,
  );
  return {
    contacts: contacts.rows.length,
    cases: cases.rows.length,
    conversations: conversations.rows.length,
  };
}
