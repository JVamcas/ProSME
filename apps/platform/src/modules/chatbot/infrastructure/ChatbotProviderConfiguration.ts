import "server-only";
import type { StorageOptions } from "@google-cloud/storage";
import { z } from "zod";
import { getGoogleCloudStorageOptions } from "@/integrations/storage/GoogleCloudStorageOptions";

const chatbotProviderSchema = z
  .object({
    project: z.string().regex(/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/),
    location: z.enum(["eu", "us", "global"]),
    model: z.literal("gemini-3.8-flash"),
  })
  .strict();

export function chatbotProviderConfiguration(
  environment: Record<string, string | undefined> = process.env,
  cloudOptions?: Pick<StorageOptions, "projectId">,
) {
  const project =
    environment.GOOGLE_CLOUD_PROJECT?.trim() ||
    (cloudOptions ?? getGoogleCloudStorageOptions()).projectId;
  return chatbotProviderSchema.parse({
    project,
    location: environment.CHATBOT_MODEL_LOCATION?.trim() || "global",
    model: environment.CHATBOT_MODEL?.trim() || "gemini-3.8-flash",
  });
}
