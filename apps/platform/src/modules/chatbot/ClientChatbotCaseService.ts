"use client";
import { patchData, postData, requestData } from "@/lib/client-http";
import type { ChatbotCase, ChatbotCaseSummary } from "./domain/ChatbotCase";
import type { z } from "zod";
import type {
  chatbotCaseAssignmentSchema,
  chatbotCaseUpdateSchema,
} from "./api/ChatbotConversationSchemas";
const base = "/api/admin/chatbot/cases";
export type ChatbotCaseCursor = { after: string; afterId: string };
export type ChatbotCaseScope = "assigned" | "all";

function list(
  cursor?: ChatbotCaseCursor,
  signal?: AbortSignal,
  scope?: ChatbotCaseScope,
) {
  const query = new URLSearchParams(cursor);
  if (scope) query.set("scope", scope);
  return requestData<{
    items: ChatbotCaseSummary[];
    nextCursor: ChatbotCaseCursor | null;
  }>(`${base}?${query}`, { signal });
}

export const clientChatbotCaseService = {
  list,
  detail: (id: string, signal?: AbortSignal) =>
    requestData<ChatbotCase>(`${base}/${encodeURIComponent(id)}`, { signal }),
  assignees: (signal?: AbortSignal) =>
    requestData<{ id: string; name: string; email: string }[]>(
      `${base}/assignees`,
      { signal },
    ),
  update: (input: {
    id: string;
    values: z.output<typeof chatbotCaseUpdateSchema>;
  }) =>
    patchData<ChatbotCase, typeof input.values>(
      `${base}/${encodeURIComponent(input.id)}`,
      input.values,
    ),
  assign: (input: {
    id: string;
    values: z.output<typeof chatbotCaseAssignmentSchema>;
  }) =>
    postData(
      `${base}/${encodeURIComponent(input.id)}/assignment`,
      input.values,
    ),
};
