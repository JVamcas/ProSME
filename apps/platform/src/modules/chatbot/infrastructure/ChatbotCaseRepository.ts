import "server-only";
import { sql } from "drizzle-orm";
import type { DatabaseTransaction } from "@/platform/database/client";
import {
  ResourceNotFoundError,
  ResourceConflictError,
} from "@/lib/resource-errors";
import type {
  ChatbotAnswer,
  ConversationMessage,
} from "../domain/ChatbotAnswer";
import type { ChatbotCase, ChatbotCaseSummary } from "../domain/ChatbotCase";

function caseReference(column: ReturnType<typeof sql>) {
  return sql`'SUP-' || lpad(${column}::text, greatest(6, length(${column}::text)), '0')`;
}

export async function upsertUnresolvedChatbotCase(
  transaction: DatabaseTransaction,
  input: {
    conversationId: string;
    turnId: string;
    question: string;
    history: ConversationMessage[];
    answer: ChatbotAnswer;
    days: number;
  },
) {
  await transaction.execute(
    sql`DELETE FROM app_chatbot_cases WHERE conversation_id = ${input.conversationId}::uuid AND expires_at <= now()`,
  );
  const result = await transaction.execute(sql`
    INSERT INTO app_chatbot_cases(conversation_id, last_turn_id, question, history, reason, release_id, source_ids, expires_at)
    VALUES (${input.conversationId}::uuid, ${input.turnId}::uuid, ${input.question}, ${JSON.stringify(input.history)}::jsonb, ${input.answer.reason}, ${input.answer.releaseId}::uuid, ${JSON.stringify(input.answer.sourceIds)}::jsonb, now() + ${input.days} * interval '1 day')
    ON CONFLICT(conversation_id) WHERE state <> 'RESOLVED' DO UPDATE SET
      last_turn_id = EXCLUDED.last_turn_id, question = EXCLUDED.question, history = EXCLUDED.history,
      reason = EXCLUDED.reason, release_id = EXCLUDED.release_id, source_ids = EXCLUDED.source_ids,
      updated_at = now(), row_version = app_chatbot_cases.row_version + 1
    RETURNING id, ${caseReference(sql`case_number`)} AS reference, (xmax = 0) AS created
  `);
  const row = result.rows[0] as {
    id: string;
    reference: string;
    created: boolean;
  };
  await transaction.execute(sql`
    INSERT INTO app_chatbot_case_audit(case_id, action, turn_id) VALUES (${row.id}::uuid, ${row.created ? "CREATED" : "UNRESOLVED_TURN"}, ${input.turnId}::uuid)
  `);
  return row;
}

export async function readChatbotCaseAssignment(
  transaction: DatabaseTransaction,
  id: string,
) {
  const result = await transaction.execute(
    sql`SELECT assigned_to AS "assignedTo" FROM app_chatbot_cases WHERE id = ${id}::uuid AND expires_at > now() FOR UPDATE`,
  );
  if (!result.rows[0]) throw new ResourceNotFoundError("support case");
  return result.rows[0].assignedTo as string | null;
}

export async function auditChatbotCaseAccess(
  transaction: DatabaseTransaction,
  actorId: string,
  id: string | null,
  action: string,
) {
  await transaction.execute(
    sql`INSERT INTO app_chatbot_case_audit(case_id, actor_id, action) VALUES (${id}::uuid, ${actorId}::uuid, ${action})`,
  );
}

const summary = sql`c.id, ${caseReference(sql`c.case_number`)} AS reference, c.state, c.assigned_to AS "assignedTo", u.display_name AS "assigneeName", c.reason,
  to_char(c.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US') || 'Z' AS "createdAt",
  to_char(c.updated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US') || 'Z' AS "updatedAt", c.row_version AS "rowVersion"`;

export async function readChatbotCaseHistory(
  transaction: DatabaseTransaction,
  id: string,
): Promise<ChatbotCase> {
  const result = await transaction.execute(sql`
    SELECT ${summary}, c.question, c.history, c.release_id AS "releaseId", c.source_ids AS "sourceIds", c.resolution_note AS "resolutionNote",
      CASE WHEN c.contact_expires_at > now() THEN c.contact END AS contact
    FROM app_chatbot_cases c LEFT JOIN app_users u ON u.id = c.assigned_to WHERE c.id = ${id}::uuid AND c.expires_at > now()
  `);
  if (!result.rows[0]) throw new ResourceNotFoundError("support case");
  return result.rows[0] as ChatbotCase;
}

export async function listChatbotCases(
  transaction: DatabaseTransaction,
  actorId: string,
  all: boolean,
  query: { after?: string; afterId?: string; state?: string },
) {
  const result = await transaction.execute(sql`
    SELECT ${summary} FROM app_chatbot_cases c LEFT JOIN app_users u ON u.id = c.assigned_to
    WHERE c.expires_at > now() ${all ? sql`` : sql`AND c.assigned_to = ${actorId}::uuid`}
      ${query.state ? sql`AND c.state = ${query.state}` : sql``}
      ${query.after ? sql`AND (c.updated_at,c.id) < (${query.after}::timestamptz,${query.afterId}::uuid)` : sql``}
    ORDER BY c.updated_at DESC,c.id DESC LIMIT 51
  `);
  return result.rows as ChatbotCaseSummary[];
}

export async function updateChatbotCase(
  transaction: DatabaseTransaction,
  id: string,
  expected: number,
  update:
    { state: string; resolutionNote: string } | { assignedTo: string | null },
) {
  const changes =
    "state" in update
      ? sql`state = ${update.state}, resolution_note = ${update.resolutionNote || null}`
      : sql`assigned_to = ${update.assignedTo}::uuid`;
  const result = await transaction.execute(
    sql`UPDATE app_chatbot_cases SET ${changes}, updated_at = now(), row_version = row_version + 1 WHERE id = ${id}::uuid AND row_version = ${expected} AND expires_at > now() RETURNING id`,
  );
  if (!result.rows.length)
    throw new ResourceConflictError("The case changed. Reload before saving.");
}

export async function saveChatbotContact(
  transaction: DatabaseTransaction,
  conversationId: string,
  contact: unknown,
  days: number,
) {
  const result = await transaction.execute(sql`
    UPDATE app_chatbot_cases SET contact = ${JSON.stringify(contact)}::jsonb, contact_expires_at = least(expires_at,now() + ${days} * interval '1 day')
    WHERE conversation_id = ${conversationId}::uuid AND state <> 'RESOLVED' AND expires_at > now() RETURNING id
  `);
  if (!result.rows.length) throw new ResourceNotFoundError("open support case");
  await transaction.execute(
    sql`INSERT INTO app_chatbot_case_audit(case_id,action) VALUES (${result.rows[0].id}::uuid,'CONTACT_SAVED')`,
  );
}
