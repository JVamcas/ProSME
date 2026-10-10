import type { PreparedKnowledge } from "../domain/ChatbotKnowledge";

export function approvedKnowledgeDocument(
  snapshot: PreparedKnowledge,
  releaseId: string,
  contentHash: string,
) {
  return {
    schemaVersion: 1,
    releaseId,
    contentHash,
    records: snapshot.records.map((record) => ({
      ...record,
      approval: { releaseId, contentHash },
    })),
  };
}
