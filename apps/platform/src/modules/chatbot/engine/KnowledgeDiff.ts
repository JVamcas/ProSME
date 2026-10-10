import type {
  KnowledgeChange,
  KnowledgeRecord,
} from "../domain/ChatbotKnowledge";

export function knowledgeDiff(
  before: KnowledgeRecord[],
  after: KnowledgeRecord[],
): KnowledgeChange[] {
  const previous = new Map(before.map((record) => [record.id, record]));
  const changes: KnowledgeChange[] = [];
  for (const record of after) {
    const old = previous.get(record.id);
    previous.delete(record.id);
    if (!old) {
      changes.push({ kind: "added", before: null, after: record });
    } else if (JSON.stringify(old) !== JSON.stringify(record)) {
      changes.push({ kind: "changed", before: old, after: record });
    }
  }
  for (const record of previous.values()) {
    changes.push({ kind: "removed", before: record, after: null });
  }
  return changes;
}
