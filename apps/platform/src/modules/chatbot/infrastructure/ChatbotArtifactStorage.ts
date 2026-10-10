import "server-only";
import { createHash } from "node:crypto";
import { Storage } from "@google-cloud/storage";
import { getGoogleCloudStorageOptions } from "@/integrations/storage/GoogleCloudStorageOptions";
import { chatbotLimits } from "../domain/ChatbotLimits";
import { chatbotKnowledgeObjectKeys } from "./ChatbotKnowledgeStorageContract";

export type StoredKnowledgeObject = { bytes: Buffer; generation: string };
export interface ChatbotArtifactStorage {
  putOnce(key: string, bytes: Buffer): Promise<StoredKnowledgeObject>;
  read(key: string, generation?: string): Promise<StoredKnowledgeObject>;
}

export function artifactChecksum(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function createChatbotArtifactStorage(
  releaseId: string,
): ChatbotArtifactStorage {
  const keys = chatbotKnowledgeObjectKeys(releaseId);
  const bucket = new Storage(getGoogleCloudStorageOptions()).bucket(
    keys.bucket,
  );
  function file(key: string, generation?: string) {
    if (key !== keys.knowledge && key !== keys.manifest)
      throw new Error("Invalid chatbot artifact key.");
    return bucket.file(key, generation ? { generation } : undefined);
  }
  const read: ChatbotArtifactStorage["read"] = async (key, generation) => {
    const object = file(key, generation);
    const [metadata] = await object.getMetadata();
    const pinnedGeneration = String(metadata.generation);
    if (!/^\d+$/.test(pinnedGeneration))
      throw new Error("Artifact generation missing.");
    if (Number(metadata.size) > chatbotLimits.knowledgeBytes)
      throw new Error("Artifact exceeds limit.");
    const chunks: Buffer[] = [];
    let length = 0;
    const stream = file(key, pinnedGeneration).createReadStream({
      validation: "crc32c",
    });
    for await (const chunk of stream) {
      length += chunk.length;
      if (length > chatbotLimits.knowledgeBytes) {
        stream.destroy();
        throw new Error("Artifact exceeds limit.");
      }
      chunks.push(Buffer.from(chunk));
    }
    return { bytes: Buffer.concat(chunks), generation: pinnedGeneration };
  };
  return {
    read,
    async putOnce(key, bytes) {
      if (bytes.length > chatbotLimits.knowledgeBytes)
        throw new Error("Artifact exceeds limit.");
      try {
        await file(key).save(bytes, {
          resumable: false,
          validation: "crc32c",
          preconditionOpts: { ifGenerationMatch: 0 },
          metadata: {
            contentType: "application/json",
            cacheControl: "private, no-store",
          },
        });
      } catch (error) {
        if (!(
          error &&
          typeof error === "object" &&
          "code" in error &&
          Number(error.code) === 412
        ))
          throw error;
        // Retries can adopt the already-created immutable object only after verification.
      }
      const stored = await read(key);
      if (artifactChecksum(stored.bytes) !== artifactChecksum(bytes))
        throw new Error("Artifact checksum verification failed.");
      return stored;
    },
  };
}
