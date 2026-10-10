"use client";

import { postData, requestData } from "@/lib/client-http";
import type { z } from "zod";
import type {
  chatbotContactSchema,
  chatbotSessionSchema,
  chatbotTurnSchema,
} from "./api/ChatbotConversationSchemas";
import type {
  ChatbotNotice,
  ChatbotSession,
  PublicChatbotTurnResponse,
} from "./domain/ChatbotConversation";

const base = "/api/chatbot/sessions";

function sessionRequest<T>(
  session: ChatbotSession,
  action: "turns" | "contact",
  values: unknown,
) {
  return requestData<T>(`${base}/${encodeURIComponent(session.id)}/${action}`, {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${session.credential}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(values),
  });
}

export const clientChatbotConversationService = {
  notice: (signal?: AbortSignal) =>
    requestData<ChatbotNotice>(base, { signal, cache: "no-store" }),
  start: (values: z.infer<typeof chatbotSessionSchema>) =>
    postData<ChatbotSession, typeof values>(base, values),
  question: (
    session: ChatbotSession,
    values: z.infer<typeof chatbotTurnSchema>,
  ) => sessionRequest<PublicChatbotTurnResponse>(session, "turns", values),
  contact: (
    session: ChatbotSession,
    values: z.infer<typeof chatbotContactSchema>,
  ) => sessionRequest<{ saved: true }>(session, "contact", values),
};
