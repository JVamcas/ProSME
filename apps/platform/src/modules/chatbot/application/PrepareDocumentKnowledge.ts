import type { ChatbotDocumentKnowledge } from "../domain/ChatbotDocument";
import { chatbotDocumentLimits } from "../domain/ChatbotDocument";
import type {
  KnowledgeRecord,
  KnowledgeSource,
} from "../domain/ChatbotKnowledge";

export function prepareDocumentKnowledge(document: ChatbotDocumentKnowledge) {
  const source: KnowledgeSource = {
    kind: "document",
    id: document.id,
    revision: document.contentHash,
    fingerprint: document.contentHash,
    url: `/api/public/chatbot/documents/${document.id}`,
    label: document.name,
  };
  const records: KnowledgeRecord[] = [];
  for (
    let offset = 0;
    offset < document.text.length;
    offset += chatbotDocumentLimits.chunkCharacters
  ) {
    records.push({
      id: `document:${document.id}:${records.length + 1}`,
      kind: "document",
      title: document.name,
      source,
      scope: null,
      facts: {},
      text: document.text.slice(
        offset,
        offset + chatbotDocumentLimits.chunkCharacters,
      ),
    });
  }
  return { source, records };
}
