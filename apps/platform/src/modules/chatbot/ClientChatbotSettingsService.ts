"use client";
import { patchData, requestData } from "@/lib/client-http";
import type { ChatbotSettingsView } from "./domain/ChatbotSettings";
import type { ChatbotSettingsUpdate } from "./api/ChatbotSettingsSchemas";

const base = "/api/admin/chatbot/settings";
export const clientChatbotSettingsService = {
  read: (signal?: AbortSignal) =>
    requestData<ChatbotSettingsView>(base, { signal }),
  update: (values: ChatbotSettingsUpdate) =>
    patchData<ChatbotSettingsView, ChatbotSettingsUpdate>(base, values),
};
