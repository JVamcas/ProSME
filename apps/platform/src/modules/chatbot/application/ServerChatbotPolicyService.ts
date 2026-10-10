import "server-only";
import { z } from "zod";
import { requirePermission } from "@/auth/authorization/policy";
import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";
import { chatbotPolicySchema } from "../api/ChatbotKnowledgeSchemas";
import { readChatbotOperationalPolicy } from "../infrastructure/ChatbotOperationalPolicy";
import {
  readStoredChatbotPolicy,
  storeChatbotPolicy,
  purgeExpiredChatbotData,
} from "../infrastructure/ChatbotPolicyRepository";
import { knowledgeTransaction } from "../infrastructure/ChatbotKnowledgeRepository";
import type { DatabaseTransaction } from "@/platform/database/client";

export async function chatbotOperationalPolicy(
  transaction?: DatabaseTransaction,
) {
  return chatbotPolicySchema.parse(
    (await readStoredChatbotPolicy(transaction)) ??
      readChatbotOperationalPolicy(),
  );
}

export async function getChatbotRetentionPolicy(
  user: AuthenticatedUser | null,
) {
  requirePermission(user, permissionCodes.chatbotRetentionUpdateAll);
  const policy = await chatbotOperationalPolicy();
  return {
    sessionMinutes: policy.sessionMinutes,
    escalationDays: policy.escalationDays,
    contactDays: policy.contactDays,
  };
}

const retentionUpdate = z
  .object({
    sessionMinutes: chatbotPolicySchema.shape.sessionMinutes,
    escalationDays: chatbotPolicySchema.shape.escalationDays,
    contactDays: chatbotPolicySchema.shape.contactDays,
  })
  .strict();
export async function updateChatbotRetentionPolicy(
  user: AuthenticatedUser | null,
  values: unknown,
) {
  const actor = requirePermission(
    user,
    permissionCodes.chatbotRetentionUpdateAll,
  );
  const input = retentionUpdate.parse(values);
  return knowledgeTransaction(async (transaction) => {
    const policy = {
      ...(await chatbotOperationalPolicy(transaction)),
      ...input,
    };
    await storeChatbotPolicy(transaction, actor.id, policy);
    return input;
  });
}

// Called only behind authenticated internal processor transport.
export async function cleanupChatbotRetention() {
  return knowledgeTransaction(async (transaction) =>
    purgeExpiredChatbotData(
      transaction,
      (await chatbotOperationalPolicy(transaction)).escalationDays,
    ),
  );
}
