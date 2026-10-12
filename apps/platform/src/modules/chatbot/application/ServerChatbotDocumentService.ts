import "server-only";
import { z } from "zod";
import type { AuthenticatedUser } from "@/auth/types";
import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import {
  RequestValidationError,
  ResourceNotFoundError,
} from "@/lib/resource-errors";
import type { DocumentStorage } from "@/integrations/storage/DocumentStorage";
import { GoogleCloudDocumentStorage } from "@/integrations/storage/GoogleCloudDocumentStorage";
import { resolveGcsObjectPath } from "@/integrations/storage/GcsObjectPath";
import { chatbotDocumentFileNameSchema } from "../api/ChatbotDocumentSchemas";
import { chatbotDocumentLimits } from "../domain/ChatbotDocument";
import { containsChatbotInstructions } from "../engine/ChatbotScreening";
import { extractChatbotDocumentText } from "../infrastructure/ChatbotDocumentTextExtractor";
import {
  insertChatbotDocument,
  readChatbotDocument,
} from "../infrastructure/ChatbotDocumentRepository";
import { knowledgeTransaction } from "../infrastructure/ChatbotKnowledgeRepository";
import { knowledgeFingerprint } from "../infrastructure/KnowledgeFingerprint";

export function requireChatbotDocumentUpload(user: AuthenticatedUser | null) {
  requirePermission(user, permissionCodes.chatbotKnowledgeReadAll);
  return requirePermission(
    user,
    permissionCodes.chatbotKnowledgeDocumentUploadAll,
  );
}

export async function uploadChatbotDocument(
  user: AuthenticatedUser | null,
  input: { fileName: string; bytes: Buffer },
  storage: DocumentStorage = new GoogleCloudDocumentStorage(),
) {
  const actor = requireChatbotDocumentUpload(user);
  const fileName = chatbotDocumentFileNameSchema.parse(input.fileName);
  if (
    !input.bytes.length ||
    input.bytes.length > chatbotDocumentLimits.fileBytes
  ) {
    throw new RequestValidationError("Select a document up to 5 MB.");
  }
  const extracted = await extractChatbotDocumentText(fileName, input.bytes);
  const text = extracted.text.normalize("NFKC").replace(/\r\n?/g, "\n").trim();
  if (!text || !/[\p{L}\p{N}]/u.test(text)) {
    throw new RequestValidationError(
      "No readable text was found. Scanned documents need a text layer before upload.",
    );
  }
  if (
    text.length > chatbotDocumentLimits.textCharacters ||
    /[\u0000\u0001-\u0008\u000b\u000c\u000e-\u001f]/.test(text)
  ) {
    throw new RequestValidationError(
      "The document contains unsupported content or too much text. Split it into smaller documents.",
    );
  }
  if (containsChatbotInstructions(text)) {
    throw new RequestValidationError(
      "The document contains instructions that cannot be used as programme knowledge.",
    );
  }
  const id = crypto.randomUUID();
  const name = fileName.replace(/\.[^.]+$/, "");
  const objectKey = resolveGcsObjectPath(
    "chatbot-knowledge-base",
    "documents",
    id,
    fileName,
  );
  await storage.put({
    body: input.bytes,
    contentType: extracted.contentType,
    objectKey,
  });
  try {
    await knowledgeTransaction((transaction) =>
      insertChatbotDocument(transaction, {
        id,
        name,
        fileName,
        objectKey,
        contentType: extracted.contentType,
        bytes: input.bytes.length,
        text,
        contentHash: knowledgeFingerprint({ name, text }),
        actorId: actor.id,
      }),
    );
  } catch (error) {
    await storage.delete(objectKey).catch(() => undefined);
    throw error;
  }
  return { id, name, fileName, text, active: false };
}

export async function getChatbotDocument(
  user: AuthenticatedUser | null,
  id: string,
) {
  requirePermission(user, permissionCodes.chatbotKnowledgeReadAll);
  const document = await readChatbotDocument(z.uuid().parse(id));
  if (!document)
    throw new ResourceNotFoundError("Knowledge document not found.");
  return document;
}

export async function getPublicChatbotDocument(id: string) {
  const document = await readChatbotDocument(z.uuid().parse(id), true);
  if (!document)
    throw new ResourceNotFoundError("Knowledge document not found.");
  return { name: document.name, text: document.text };
}
