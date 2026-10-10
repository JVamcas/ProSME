import "server-only";
import type { ChatbotAnswer } from "../domain/ChatbotAnswer";
import type { ChatbotTurnResponse } from "../domain/ChatbotConversation";
import type { chatbotKnowledgeRuntime } from "./ServerChatbotKnowledgeRuntime";
import { knowledgeTransaction } from "../infrastructure/ChatbotKnowledgeRepository";
import {
  readProtectedConversation,
  requireChatbotTurnClaim,
  saveChatbotTurn,
} from "../infrastructure/ChatbotConversationRepository";
import { upsertUnresolvedChatbotCase } from "../infrastructure/ChatbotCaseRepository";
import { captureChatbotCaseNotification } from "@/modules/notifications/application/ChatbotCaseNotifications";
import { chatbotOperationalPolicy } from "./ServerChatbotPolicyService";
import { unresolvedChatbotAnswer } from "./SelectChatbotAnswer";
import { requirePublicChatbotEnabled } from "./ServerChatbotSettingsService";
import { chatbotGreetingAnswer } from "../engine/ChatbotConversationReplies";

export async function completeChatbotTurn(values: {
  id: string;
  credentialHash: string;
  turnId: string;
  claimId: string;
  question: string;
  answer: ChatbotAnswer;
  loaded: Awaited<ReturnType<typeof chatbotKnowledgeRuntime.load>> | null;
  callId: string | null;
  runtime: typeof chatbotKnowledgeRuntime;
}) {
  const {
    id,
    credentialHash,
    turnId,
    claimId,
    question,
    loaded,
    callId,
    runtime,
  } = values;
  let answer = values.answer;
  return knowledgeTransaction(async (transaction) => {
    const settings = await requirePublicChatbotEnabled(transaction, "share");
    if (
      !settings.modelEnabled &&
      answer.status === "ANSWERED" &&
      !chatbotGreetingAnswer(question)
    ) {
      answer = unresolvedChatbotAnswer("SERVICE_FAILURE", answer.releaseId);
    }
    const conversation = await readProtectedConversation(
      id,
      credentialHash,
      transaction,
      true,
    );
    await requireChatbotTurnClaim(transaction, id, turnId, claimId);
    if (loaded) {
      try {
        await runtime.validate(loaded.lease, transaction);
      } catch {
        answer = unresolvedChatbotAnswer(
          "SERVICE_FAILURE",
          loaded.lease.releaseId,
        );
      }
    }
    const at = new Date().toISOString();
    const history = [
      ...conversation.history,
      { role: "visitor" as const, text: question, at },
      { role: "assistant" as const, text: answer.text, at },
    ];
    const response: ChatbotTurnResponse = {
      answer,
      caseId: null,
      caseReference: null,
      notificationQueued: false,
    };
    if (answer.status === "UNRESOLVED") {
      const policy = await chatbotOperationalPolicy(transaction);
      const supportCase = await upsertUnresolvedChatbotCase(transaction, {
        conversationId: id,
        turnId: turnId,
        question: question,
        history,
        answer,
        days: policy.escalationDays,
      });
      const occurrence = await captureChatbotCaseNotification(
        transaction,
        supportCase.id,
        policy.recipientUserIds,
        supportCase.reference,
      );
      response.caseId = supportCase.id;
      response.caseReference = supportCase.reference;
      response.notificationQueued =
        occurrence.deliveryCount > 0 ||
        (!occurrence.created && occurrence.status === "PENDING");
    }
    await saveChatbotTurn(transaction, id, turnId, response, history, callId);
    return response;
  });
}
