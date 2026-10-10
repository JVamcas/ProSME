import "server-only";
import { completeChatbotTurn } from "./ServerChatbotTurnCompletion";
import { requirePublicChatbotEnabled } from "./ServerChatbotSettingsService";
import { readChatbotRuntimeSettings } from "../infrastructure/ChatbotSettingsRepository";
import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { AuthenticationRequiredError } from "@/auth/authorization/policy";
import { ResourceConflictError } from "@/lib/resource-errors";
import {
  chatbotSessionSchema,
  chatbotTurnSchema,
  chatbotContactSchema,
} from "../api/ChatbotConversationSchemas";
import {
  chatbotNoticeVersion,
  chatbotPrivacyNotice,
  type ChatbotAnswer,
  type ChatbotPassageSelector,
} from "../domain/ChatbotAnswer";
import { chatbotLimits } from "../domain/ChatbotLimits";
import { screenChatbotText } from "../engine/ChatbotScreening";
import { chatbotGreetingAnswer } from "../engine/ChatbotConversationReplies";
import { knowledgeFingerprint } from "../infrastructure/KnowledgeFingerprint";
import { knowledgeTransaction } from "../infrastructure/ChatbotKnowledgeRepository";
import {
  claimChatbotTurn,
  consumeChatbotRateLimit,
  createChatbotConversation,
  readProtectedConversation,
  releaseFailedChatbotTurn,
} from "../infrastructure/ChatbotConversationRepository";
import { saveChatbotContact } from "../infrastructure/ChatbotCaseRepository";
import { createVertexChatbotSelector } from "../infrastructure/VertexChatbotPassageSelector";
import { chatbotOperationalPolicy } from "./ServerChatbotPolicyService";
import { chatbotKnowledgeRuntime } from "./ServerChatbotKnowledgeRuntime";
import {
  selectChatbotAnswer,
  unresolvedChatbotAnswer,
} from "./SelectChatbotAnswer";

export class ChatbotRateLimitError extends Error {
  constructor() {
    super("Please wait a minute before sending another question.");
  }
}

function sessionCredential(id: string, authorization: string | null) {
  const validId = z.uuid().safeParse(id);
  const token = authorization?.match(
    /^Bearer ([a-f0-9-]{36})\.([A-Za-z0-9_-]{43})$/,
  );
  if (!validId.success || !token || token[1] !== id)
    throw new AuthenticationRequiredError();
  return knowledgeFingerprint(`${id}.${token[2]}`);
}

export async function startChatbotConversation(
  values: unknown,
  networkIdentity: string,
) {
  const input = chatbotSessionSchema.parse(values);
  await requirePublicChatbotEnabled();
  if (
    !(await consumeChatbotRateLimit(
      knowledgeFingerprint(`session:${networkIdentity}`),
      30,
    ))
  )
    throw new ChatbotRateLimitError();
  const id = randomUUID();
  const credential = `${id}.${randomBytes(32).toString("base64url")}`;
  const policy = await knowledgeTransaction(async (transaction) => {
    await requirePublicChatbotEnabled(transaction, "share");
    const currentPolicy = await chatbotOperationalPolicy(transaction);
    await createChatbotConversation(
      id,
      knowledgeFingerprint(credential),
      input.noticeVersion,
      currentPolicy.sessionMinutes,
      transaction,
    );
    return currentPolicy;
  });
  return {
    id,
    credential,
    notice: chatbotPrivacyNotice,
    noticeVersion: chatbotNoticeVersion,
    sessionMinutes: policy.sessionMinutes,
    escalationDays: policy.escalationDays,
    contactDays: policy.contactDays,
  };
}

async function boundedAnswer(operation: Promise<ChatbotAnswer>) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Chatbot selection timed out.")),
          chatbotLimits.modelTimeoutMilliseconds,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export async function submitChatbotQuestion(
  id: string,
  authorization: string | null,
  values: unknown,
  dependencies = {
    runtime: chatbotKnowledgeRuntime,
    selector: createVertexChatbotSelector() as ChatbotPassageSelector,
  },
) {
  const credentialHash = sessionCredential(id, authorization);
  const input = chatbotTurnSchema.parse(values);
  const [, settings] = await Promise.all([
    readProtectedConversation(id, credentialHash),
    requirePublicChatbotEnabled(),
  ]);
  if (
    !(await consumeChatbotRateLimit(
      knowledgeFingerprint(`conversation:${id}`),
      chatbotLimits.requestsPerMinute,
    ))
  )
    throw new ChatbotRateLimitError();
  const claimId = randomUUID();
  const claim = await knowledgeTransaction(async (transaction) => {
    await requirePublicChatbotEnabled(transaction, "share");
    const conversation = await readProtectedConversation(
      id,
      credentialHash,
      transaction,
      true,
    );
    const turn = await claimChatbotTurn(
      transaction,
      id,
      input.turnId,
      knowledgeFingerprint(input),
      claimId,
    );
    if (!turn.replay && conversation.completedTurns >= 30)
      throw new ResourceConflictError(
        "This conversation reached its limit. Start a new conversation.",
      );
    return { conversation, replay: turn.replay };
  });
  if (claim.replay) {
    if (chatbotGreetingAnswer(input.question)) return claim.replay;
    // Retried answered turns must never re-serve withdrawn content from stored responses.
    if (claim.replay.answer.status === "ANSWERED") {
      if (!settings.modelEnabled) {
        return {
          ...claim.replay,
          answer: unresolvedChatbotAnswer("SERVICE_FAILURE"),
        };
      }
      try {
        const current = await dependencies.runtime.load();
        if (current.lease.releaseId !== claim.replay.answer.releaseId)
          throw new Error("Knowledge changed.");
        await knowledgeTransaction(async (transaction) => {
          const currentSettings = await requirePublicChatbotEnabled(
            transaction,
            "share",
          );
          if (!currentSettings.modelEnabled)
            throw new Error("AI answers are turned off.");
          await dependencies.runtime.validate(current.lease, transaction);
        });
      } catch {
        return {
          ...claim.replay,
          answer: unresolvedChatbotAnswer("SERVICE_FAILURE"),
        };
      }
    }
    return claim.replay;
  }
  const screened = screenChatbotText(input.question);
  const greeting = screened.blocked ? null : chatbotGreetingAnswer(screened.text);
  let answer =
    greeting ??
    unresolvedChatbotAnswer(
      screened.blocked ? "SCREENED_QUERY" : "SERVICE_FAILURE",
    );
  let loaded: Awaited<ReturnType<typeof dependencies.runtime.load>> | null =
    null;
  let callId =
    input.fundingCallId === undefined
      ? claim.conversation.callId
      : input.fundingCallId;
  if (!greeting && !screened.blocked && settings.modelEnabled) {
    try {
      loaded = await dependencies.runtime.load();
      if (
        !(await consumeChatbotRateLimit(
          knowledgeFingerprint("provider:global"),
          100,
        ))
      )
        throw new ChatbotRateLimitError();
      answer = await boundedAnswer(
        selectChatbotAnswer({
          question: screened.text,
          context: claim.conversation.history.slice(
            -chatbotLimits.contextMessages,
          ),
          callId,
          releaseId: loaded.lease.releaseId!,
          records: loaded.records,
          selector: dependencies.selector,
        }),
      );
      if (
        callId &&
        !loaded.records.some((record) => record.scope?.fundingCallId === callId)
      )
        callId = null;
    } catch {
      answer = unresolvedChatbotAnswer(
        "SERVICE_FAILURE",
        loaded?.lease.releaseId ?? null,
      );
    }
  }
  try {
    return await completeChatbotTurn({
      id,
      credentialHash,
      turnId: input.turnId,
      claimId,
      question: screened.text,
      answer,
      loaded,
      callId,
      runtime: dependencies.runtime,
    });
  } catch (error) {
    await releaseFailedChatbotTurn(id, input.turnId, claimId);
    throw error;
  }
}

export async function getChatbotPublicNotice() {
  const [policy, settings] = await Promise.all([
    chatbotOperationalPolicy(),
    readChatbotRuntimeSettings(),
  ]);
  return {
    enabled: settings.publicEnabled,
    notice: chatbotPrivacyNotice,
    noticeVersion: chatbotNoticeVersion,
    sessionMinutes: policy.sessionMinutes,
    escalationDays: policy.escalationDays,
    contactDays: policy.contactDays,
  };
}

export async function setChatbotConversationContact(
  id: string,
  authorization: string | null,
  values: unknown,
) {
  const hash = sessionCredential(id, authorization);
  const contact = chatbotContactSchema.parse(values);
  return knowledgeTransaction(async (transaction) => {
    await requirePublicChatbotEnabled(transaction, "share");
    await readProtectedConversation(id, hash, transaction, true);
    const policy = await chatbotOperationalPolicy(transaction);
    await saveChatbotContact(transaction, id, contact, policy.contactDays);
    return { saved: true };
  });
}
