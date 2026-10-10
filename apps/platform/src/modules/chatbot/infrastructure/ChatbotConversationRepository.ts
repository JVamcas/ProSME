import "server-only";
import { sql } from "drizzle-orm";
import {
  getDatabase,
  type DatabaseTransaction,
} from "@/platform/database/client";
import { AuthenticationRequiredError } from "@/auth/authorization/policy";
import { ResourceConflictError } from "@/lib/resource-errors";
import type { ConversationMessage } from "../domain/ChatbotAnswer";
import type { ChatbotTurnResponse } from "../domain/ChatbotConversation";

export type ConversationRow = {
  id: string;
  history: ConversationMessage[];
  callId: string | null;
  completedTurns: number;
};
export async function createChatbotConversation(
  id: string,
  credentialHash: string,
  notice: string,
  minutes: number,
  transaction?: DatabaseTransaction,
) {
  await (transaction ?? getDatabase()).execute(sql`
    INSERT INTO app_chatbot_conversations(id, credential_hash, notice_version, expires_at)
    VALUES (${id}::uuid, ${credentialHash}, ${notice}, now() + ${minutes} * interval '1 minute')
  `);
}

export async function readProtectedConversation(
  id: string,
  credentialHash: string,
  transaction?: DatabaseTransaction,
  lock = false,
): Promise<ConversationRow> {
  const result = await (transaction ?? getDatabase()).execute(sql`
    SELECT id, history, call_id AS "callId", completed_turns AS "completedTurns"
    FROM app_chatbot_conversations WHERE id = ${id}::uuid AND credential_hash = ${credentialHash} AND expires_at > now()
    ${lock ? sql`FOR UPDATE` : sql``}
  `);
  if (!result.rows[0]) throw new AuthenticationRequiredError();
  return result.rows[0] as ConversationRow;
}

export async function consumeChatbotRateLimit(key: string, limit: number) {
  const result = await getDatabase().execute(sql`
    INSERT INTO app_chatbot_rate_limits(key_hash) VALUES (${key})
    ON CONFLICT(key_hash) DO UPDATE SET
      window_started_at = CASE WHEN app_chatbot_rate_limits.window_started_at <= now() - interval '1 minute' THEN now() ELSE app_chatbot_rate_limits.window_started_at END,
      request_count = CASE WHEN app_chatbot_rate_limits.window_started_at <= now() - interval '1 minute' THEN 1 ELSE app_chatbot_rate_limits.request_count + 1 END
    WHERE app_chatbot_rate_limits.window_started_at <= now() - interval '1 minute' OR app_chatbot_rate_limits.request_count < ${limit}
    RETURNING key_hash
  `);
  return result.rows.length === 1;
}

export async function claimChatbotTurn(
  transaction: DatabaseTransaction,
  conversationId: string,
  id: string,
  hash: string,
  claimId: string,
) {
  const result = await transaction.execute(sql`
    SELECT input_hash AS hash, response, claim_until > now() AS busy FROM app_chatbot_turns
    WHERE conversation_id = ${conversationId}::uuid AND id = ${id}::uuid
  `);
  const existing = result.rows[0] as
    | { hash: string; response: ChatbotTurnResponse | null; busy: boolean }
    | undefined;
  if (existing?.hash !== undefined && existing.hash !== hash)
    throw new ResourceConflictError(
      "This turn ID was already used for another question.",
    );
  if (existing?.response) return { replay: existing.response };
  if (existing?.busy)
    throw new ResourceConflictError("This question is still being processed.");
  await transaction.execute(
    sql`DELETE FROM app_chatbot_turns WHERE conversation_id = ${conversationId}::uuid AND response IS NULL AND claim_until <= now()`,
  );
  const pending = await transaction.execute(
    sql`SELECT EXISTS(SELECT 1 FROM app_chatbot_turns WHERE conversation_id = ${conversationId}::uuid AND response IS NULL) AS busy`,
  );
  if (pending.rows[0]?.busy)
    throw new ResourceConflictError(
      "Wait for the current question before sending another.",
    );
  await transaction.execute(sql`
    INSERT INTO app_chatbot_turns(conversation_id, id, input_hash, claim_id, claim_until)
    VALUES (${conversationId}::uuid, ${id}::uuid, ${hash}, ${claimId}::uuid, now() + interval '2 minutes')
  `);
  return { replay: null };
}

export async function requireChatbotTurnClaim(
  transaction: DatabaseTransaction,
  conversationId: string,
  turnId: string,
  claimId: string,
) {
  const result = await transaction.execute(sql`
    SELECT id FROM app_chatbot_turns WHERE conversation_id = ${conversationId}::uuid AND id = ${turnId}::uuid
      AND claim_id = ${claimId}::uuid AND response IS NULL AND claim_until > now() FOR UPDATE
  `);
  if (!result.rows.length)
    throw new ResourceConflictError(
      "The question expired or was retried. Please retry.",
    );
}

export async function releaseFailedChatbotTurn(
  conversationId: string,
  turnId: string,
  claimId: string,
) {
  await getDatabase().execute(
    sql`UPDATE app_chatbot_turns SET claim_until = now() WHERE conversation_id = ${conversationId}::uuid AND id = ${turnId}::uuid AND claim_id = ${claimId}::uuid AND response IS NULL`,
  );
}

export async function saveChatbotTurn(
  transaction: DatabaseTransaction,
  conversationId: string,
  turnId: string,
  response: ChatbotTurnResponse,
  history: ConversationMessage[],
  callId: string | null,
) {
  await transaction.execute(sql`
    UPDATE app_chatbot_turns SET response = ${JSON.stringify(response)}::jsonb WHERE conversation_id = ${conversationId}::uuid AND id = ${turnId}::uuid
  `);
  await transaction.execute(sql`
    UPDATE app_chatbot_conversations SET history = ${JSON.stringify(history)}::jsonb, call_id = ${callId}::uuid, completed_turns = completed_turns + 1 WHERE id = ${conversationId}::uuid
  `);
}
