import "server-only";
import type { AuthenticatedUser } from "@/auth/types";
import { requirePermission } from "@/auth/authorization/policy";
import { permissionCodes } from "@/auth/authorization/permissions";
import { RequestValidationError } from "@/lib/resource-errors";
import type { DatabaseTransaction } from "@/platform/database/client";
import {
  chatbotResourceQuerySchema,
  chatbotResourceUpdateSchema,
} from "../api/ChatbotResourceSchemas";
import type { ChatbotResourcePage } from "../domain/ChatbotResource";
import { chatbotLimits } from "../domain/ChatbotLimits";
import { knowledgeTransaction } from "../infrastructure/ChatbotKnowledgeRepository";
import {
  changeChatbotResources,
  findPublishedResourceKeys,
  listChatbotResources,
  readActiveResourceSelection,
} from "../infrastructure/ChatbotResourceRepository";
import { prepareKnowledgeSources } from "./ServerChatbotKnowledgeService";

export async function retiredChatbotKnowledgeWorkflow(
  user: AuthenticatedUser | null,
) {
  requirePermission(user, permissionCodes.chatbotKnowledgeReadAll);
  throw new RequestValidationError(
    "Use the knowledge base resource table to activate or deactivate resources. Application publication is sufficient.",
  );
}

export async function prepareActiveResourceKnowledge(
  transaction: DatabaseTransaction,
) {
  const selection = await readActiveResourceSelection(transaction);
  if (
    selection.fundingCallIds.length > chatbotLimits.selectedCalls ||
    (selection.eligibilityCallIds?.length ?? 0) > chatbotLimits.selectedCalls ||
    selection.faqIds.length > chatbotLimits.selectedFaqs
  ) {
    throw new RequestValidationError(
      "Too many active resources. Deactivate some resources and try again.",
    );
  }
  const snapshot = await prepareKnowledgeSources(selection, transaction);
  // Unsupported or conflicting passages stay out of answers without a second editorial approval.
  const excluded = new Set(snapshot.issues.map((issue) => issue.recordId));
  snapshot.records = snapshot.records.filter(
    (record) => !excluded.has(record.id),
  );
  snapshot.issues = [];
  return snapshot;
}

export async function getChatbotResources(
  user: AuthenticatedUser | null,
  values: unknown,
): Promise<ChatbotResourcePage> {
  requirePermission(user, permissionCodes.chatbotKnowledgeReadAll);
  const input = chatbotResourceQuerySchema.parse(values);
  return listChatbotResources(input);
}

export async function updateChatbotResources(
  user: AuthenticatedUser | null,
  values: unknown,
) {
  requirePermission(user, permissionCodes.chatbotKnowledgeReadAll);
  const input = chatbotResourceUpdateSchema.parse(values);
  const actor = requirePermission(
    user,
    input.active
      ? permissionCodes.chatbotKnowledgeActivateAll
      : permissionCodes.chatbotKnowledgeDeactivateAll,
  );
  return knowledgeTransaction(async (transaction) => {
    const available = await findPublishedResourceKeys(
      input.resourceKeys,
      transaction,
    );
    if (available.length !== input.resourceKeys.length) {
      throw new RequestValidationError(
        "A selected resource is no longer published. Refresh the table and try again.",
      );
    }
    await changeChatbotResources(
      transaction,
      actor.id,
      input.resourceKeys,
      input.active,
    );
    // Validate aggregate limits inside the same transaction; rejected bulk changes leave no audit or policy writes.
    if (input.active) await prepareActiveResourceKnowledge(transaction);
    return { changed: input.resourceKeys.length, active: input.active };
  });
}
