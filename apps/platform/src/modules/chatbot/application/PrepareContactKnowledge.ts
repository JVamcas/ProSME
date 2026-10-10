import type { ContactKnowledgeProjection } from "@/modules/content/application/ServerContactKnowledgeService";
import type {
  KnowledgeRecord,
  KnowledgeSource,
} from "../domain/ChatbotKnowledge";
import { knowledgeFingerprint } from "../infrastructure/KnowledgeFingerprint";

export function prepareContactKnowledge(
  contact: ContactKnowledgeProjection,
): KnowledgeRecord {
  const fingerprint = knowledgeFingerprint(contact);
  const source: KnowledgeSource = {
    kind: "contact",
    id: "contact-details",
    revision: fingerprint,
    fingerprint,
    url: "/contact",
    label: "Contact details",
  };
  const fields = [
    ["Email", contact.email],
    ["Telephone", contact.phone],
    ["Office address", contact.address],
    ["Office hours", contact.officeHours],
  ];
  return {
    id: "contact:contact-details",
    kind: "contact",
    title: "Contact details",
    source,
    scope: null,
    facts: {},
    text: fields
      .filter(([, value]) => value?.trim())
      .map(([label, value]) => `${label}: ${value}`)
      .join("\n"),
  };
}
