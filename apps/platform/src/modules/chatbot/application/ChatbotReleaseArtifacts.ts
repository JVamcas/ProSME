import "server-only";
import type { KnowledgeRelease } from "../domain/ChatbotKnowledge";
import type {
  ChatbotKnowledgeManifest,
  VerifiedChatbotArtifacts,
} from "../domain/ChatbotReleaseArtifacts";
import { chatbotKnowledgeObjectKeys } from "../infrastructure/ChatbotKnowledgeStorageContract";
import {
  artifactChecksum,
  type ChatbotArtifactStorage,
} from "../infrastructure/ChatbotArtifactStorage";
import { knowledgeJson } from "../infrastructure/KnowledgeFingerprint";
import { approvedKnowledgeDocument } from "../engine/ApprovedKnowledgeDocument";

export function releaseKnowledgeBytes(release: KnowledgeRelease) {
  return Buffer.from(
    knowledgeJson(
      approvedKnowledgeDocument(
        release.snapshot,
        release.id,
        release.contentHash,
      ),
    ),
  );
}

export async function uploadChatbotRelease(
  release: KnowledgeRelease,
  storage: ChatbotArtifactStorage,
): Promise<VerifiedChatbotArtifacts> {
  const keys = chatbotKnowledgeObjectKeys(release.id);
  const knowledgeBytes = releaseKnowledgeBytes(release);
  const object = await storage.putOnce(keys.knowledge, knowledgeBytes);
  if (artifactChecksum(object.bytes) !== artifactChecksum(knowledgeBytes))
    throw new Error("Knowledge checksum failed.");
  const knowledge = {
    objectKey: keys.knowledge,
    bytes: knowledgeBytes.length,
    sha256: artifactChecksum(knowledgeBytes),
    generation: object.generation,
  };
  const manifest: ChatbotKnowledgeManifest = {
    schemaVersion: 1,
    releaseId: release.id,
    contentHash: release.contentHash,
    preparedAt: release.preparedAt,
    sources: release.snapshot.sources,
    knowledgeFile: knowledge,
  };
  const manifestBytes = Buffer.from(knowledgeJson(manifest));
  const saved = await storage.putOnce(keys.manifest, manifestBytes);
  if (artifactChecksum(saved.bytes) !== artifactChecksum(manifestBytes))
    throw new Error("Manifest checksum failed.");
  return {
    releaseId: release.id,
    knowledge,
    manifest: {
      objectKey: keys.manifest,
      bytes: manifestBytes.length,
      sha256: artifactChecksum(manifestBytes),
      generation: saved.generation,
    },
  };
}

export async function verifyChatbotRelease(
  release: KnowledgeRelease,
  verified: VerifiedChatbotArtifacts,
  storage: ChatbotArtifactStorage,
) {
  const keys = chatbotKnowledgeObjectKeys(release.id);
  if (
    verified.releaseId !== release.id ||
    verified.knowledge.objectKey !== keys.knowledge ||
    verified.manifest.objectKey !== keys.manifest
  )
    throw new Error("Artifact binding failed.");
  const [knowledge, manifest] = await Promise.all([
    storage.read(keys.knowledge, verified.knowledge.generation),
    storage.read(keys.manifest, verified.manifest.generation),
  ]);
  for (const [object, expected] of [
    [knowledge, verified.knowledge],
    [manifest, verified.manifest],
  ] as const) {
    if (
      object.bytes.length !== expected.bytes ||
      object.generation !== expected.generation ||
      artifactChecksum(object.bytes) !== expected.sha256
    )
      throw new Error("Artifact verification failed.");
  }
  if (!knowledge.bytes.equals(releaseKnowledgeBytes(release)))
    throw new Error("Artifact content differs from approved preview.");
  const expectedManifest: ChatbotKnowledgeManifest = {
    schemaVersion: 1,
    releaseId: release.id,
    contentHash: release.contentHash,
    preparedAt: release.preparedAt,
    sources: release.snapshot.sources,
    knowledgeFile: verified.knowledge,
  };
  if (manifest.bytes.toString() !== knowledgeJson(expectedManifest))
    throw new Error("Manifest content differs from approval.");
  return release.snapshot.records;
}
