import type { KnowledgeRecord, KnowledgeSource } from "./ChatbotKnowledge";

// CB3 consumes the approved snapshot; no adapter may reread and replace passages
// while writing the artifact. The database owns the sole active-release pointer.
export type ApprovedKnowledgeRecord = KnowledgeRecord & {
  approval: { releaseId: string; contentHash: string };
};

export type ChatbotKnowledgeManifest = {
  schemaVersion: 1;
  releaseId: string;
  contentHash: string;
  preparedAt: string;
  sources: KnowledgeSource[];
  knowledgeFile: {
    objectKey: string;
    bytes: number;
    sha256: string;
    generation: string;
  };
};

export type VerifiedChatbotArtifacts = {
  releaseId: string;
  manifest: {
    objectKey: string;
    bytes: number;
    sha256: string;
    generation: string;
  };
  knowledge: ChatbotKnowledgeManifest["knowledgeFile"];
};
