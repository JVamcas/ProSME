import "server-only";
import { z } from "zod";
import { resolveGcsObjectPath } from "@/integrations/storage/GcsObjectPath";

// Validate only when an artifact operation needs storage. Missing provisioning
// never blocks database preparation, preview or approval.
export function chatbotKnowledgeObjectKeys(
  releaseId: string,
  bucket = process.env.GCS_CHATBOT_KNOWLEDGE_BUCKET,
) {
  const id = z.uuid().parse(releaseId);
  const configuredBucket = z
    .string()
    .min(3)
    .max(222)
    .regex(/^[a-z0-9][a-z0-9._-]+[a-z0-9]$/)
    .parse(bucket?.trim() || process.env.GCS_DOCUMENTS_BUCKET);
  const prefix = resolveGcsObjectPath("chatbot-knowledge-base", "releases", id);
  return {
    bucket: configuredBucket,
    manifest: `${prefix}/manifest.json`,
    knowledge: `${prefix}/knowledge.json`,
  };
}
