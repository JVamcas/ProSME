import "server-only";
import { sql } from "drizzle-orm";
import {
  getDatabase,
  type DatabaseTransaction,
} from "@/platform/database/client";
import { ResourceConflictError } from "@/lib/resource-errors";
import type { ChatbotRuntimeSettings } from "../domain/ChatbotSettings";
import type { ChatbotSettingsUpdate } from "../api/ChatbotSettingsSchemas";

const projection = sql`public_enabled AS "publicEnabled", model_enabled AS "modelEnabled", row_version AS "rowVersion"`;

export async function readChatbotRuntimeSettings(
  transaction?: DatabaseTransaction,
  lock?: "share" | "update",
): Promise<ChatbotRuntimeSettings> {
  let locking = sql``;
  if (lock === "share") locking = sql`FOR SHARE`;
  if (lock === "update") locking = sql`FOR UPDATE`;
  const result = await (transaction ?? getDatabase()).execute(sql`
    SELECT ${projection} FROM app_chatbot_settings WHERE key = 'SETTINGS' ${locking}
  `);
  if (!result.rows[0])
    throw new ResourceConflictError(
      "Chatbot settings have not been initialized.",
    );
  return result.rows[0] as ChatbotRuntimeSettings;
}

export async function storeChatbotSettings(
  transaction: DatabaseTransaction,
  actorId: string,
  before: ChatbotRuntimeSettings,
  input: ChatbotSettingsUpdate,
) {
  const result = await transaction.execute(sql`
    UPDATE app_chatbot_settings SET public_enabled = ${input.publicEnabled}, model_enabled = ${input.modelEnabled},
      row_version = row_version + 1, updated_by = ${actorId}::uuid, updated_at = now()
    WHERE key = 'SETTINGS' AND row_version = ${input.expectedRowVersion} RETURNING ${projection}
  `);
  if (!result.rows[0])
    throw new ResourceConflictError(
      "Chatbot settings changed. Reload before saving.",
    );
  const after = result.rows[0] as ChatbotRuntimeSettings;
  await transaction.execute(sql`
    INSERT INTO app_chatbot_settings_audit(actor_id,before_settings,after_settings)
    VALUES (${actorId}::uuid,${JSON.stringify(before)}::jsonb,${JSON.stringify(after)}::jsonb)
  `);
  return after;
}
