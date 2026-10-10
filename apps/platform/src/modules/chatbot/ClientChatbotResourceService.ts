"use client";
import { requestData } from "@/lib/client-http";
import type { ChatbotResourcePage } from "./domain/ChatbotResource";
import type {
  ChatbotResourceUpdate,
  ChatbotResourceQuery,
} from "./api/ChatbotResourceSchemas";

const base = "/api/admin/chatbot/knowledge/resources";
export const clientChatbotResourceService = {
  list(input: ChatbotResourceQuery, signal?: AbortSignal) {
    const query = new URLSearchParams({
      page: String(input.page),
      pageSize: String(input.pageSize),
    });
    return requestData<ChatbotResourcePage>(`${base}?${query}`, { signal });
  },
  update(values: ChatbotResourceUpdate) {
    return requestData<{ changed: number; active: boolean }>(base, {
      method: "PATCH",
      body: JSON.stringify(values),
      headers: { "Content-Type": "application/json" },
    });
  },
};
