import "server-only";
import { sql } from "drizzle-orm";
import {
  getDatabase,
  type DatabaseTransaction,
} from "@/platform/database/client";
import type {
  ChatbotDocumentKnowledge,
  ChatbotDocumentPreview,
} from "../domain/ChatbotDocument";

export async function insertChatbotDocument(
  transaction: DatabaseTransaction,
  input: {
    id: string;
    name: string;
    fileName: string;
    objectKey: string;
    contentType: string;
    bytes: number;
    text: string;
    contentHash: string;
    actorId: string;
  },
) {
  await transaction.execute(sql`
    INSERT INTO app_chatbot_documents(id, name, file_name, object_key, content_type,
      file_bytes, extracted_text, content_hash, uploaded_by)
    VALUES (${input.id}::uuid, ${input.name}, ${input.fileName}, ${input.objectKey},
      ${input.contentType}, ${input.bytes}, ${input.text}, ${input.contentHash}, ${input.actorId}::uuid)
  `);
  await transaction.execute(sql`
    INSERT INTO app_chatbot_document_audit(document_id, actor_id, action)
    VALUES (${input.id}::uuid, ${input.actorId}::uuid, 'UPLOADED')
  `);
  await transaction.execute(sql`
    INSERT INTO app_chatbot_resources(resource_key, active, updated_by)
    VALUES (${"document:" + input.id}, false, ${input.actorId}::uuid)
  `);
}

export async function readChatbotDocument(id: string, publicOnly = false) {
  const result = await getDatabase().execute(sql`
    SELECT d.id, d.name, d.file_name AS "fileName", d.extracted_text AS text,
      coalesce(r.active, false) AS active
    FROM app_chatbot_documents d
    LEFT JOIN app_chatbot_resources r ON r.resource_key = 'document:' || d.id::text
    WHERE d.id = ${id}::uuid ${publicOnly ? sql`AND r.active` : sql``}
  `);
  return (result.rows[0] as ChatbotDocumentPreview | undefined) ?? null;
}

export async function readChatbotDocumentKnowledge(
  transaction: DatabaseTransaction,
  ids: string[],
) {
  if (!ids.length) return [];
  const result = await transaction.execute(sql`
    SELECT d.id, d.name, d.extracted_text AS text, d.content_hash AS "contentHash"
    FROM app_chatbot_documents d
    JOIN app_chatbot_resources r ON r.resource_key = 'document:' || d.id::text AND r.active
    WHERE d.id = ANY(${sql.param(ids)}::uuid[]) ORDER BY d.id
  `);
  return result.rows as ChatbotDocumentKnowledge[];
}
