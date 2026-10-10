import "server-only";
import type { AuthenticatedUser } from "@/auth/types";
import { requirePermission } from "@/auth/authorization/policy";
import { permissionCodes } from "@/auth/authorization/permissions";
import { RequestValidationError } from "@/lib/resource-errors";
import { chatbotSettingsUpdateSchema } from "../api/ChatbotSettingsSchemas";
import {
  readChatbotRuntimeSettings,
  storeChatbotSettings,
} from "../infrastructure/ChatbotSettingsRepository";
import { chatbotProviderConfiguration } from "../infrastructure/ChatbotProviderConfiguration";
import { knowledgeTransaction } from "../infrastructure/ChatbotKnowledgeRepository";
import type { DatabaseTransaction } from "@/platform/database/client";

function providerReady() {
  try {
    chatbotProviderConfiguration();
    return true;
  } catch {
    return false;
  }
}

export async function getChatbotSettings(user: AuthenticatedUser | null) {
  requirePermission(user, permissionCodes.chatbotSettingsReadAll);
  return {
    ...(await readChatbotRuntimeSettings()),
    providerReady: providerReady(),
  };
}

export async function updateChatbotSettings(
  user: AuthenticatedUser | null,
  values: unknown,
) {
  const actor = requirePermission(
    user,
    permissionCodes.chatbotSettingsUpdateAll,
  );
  const input = chatbotSettingsUpdateSchema.parse(values);
  return knowledgeTransaction(async (transaction) => {
    const before = await readChatbotRuntimeSettings(transaction, "update");
    if (input.modelEnabled && !before.modelEnabled && !providerReady()) {
      throw new RequestValidationError(
        "AI answers cannot be enabled until the AI provider is configured.",
      );
    }
    const settings = await storeChatbotSettings(
      transaction,
      actor.id,
      before,
      input,
    );
    return { ...settings, providerReady: providerReady() };
  });
}

export async function requirePublicChatbotEnabled(
  transaction?: DatabaseTransaction,
  lock?: "share",
) {
  const settings = await readChatbotRuntimeSettings(transaction, lock);
  if (!settings.publicEnabled)
    throw new RequestValidationError("Programme chat is currently turned off.");
  return settings;
}
