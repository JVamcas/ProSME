"use client";

import { requestData } from "@/lib/client-http";
import type { ChatbotDocumentPreview } from "./domain/ChatbotDocument";

const base = "/api/admin/chatbot/knowledge/documents";

export const clientChatbotDocumentService = {
  upload(file: File) {
    return requestData<ChatbotDocumentPreview>(base, {
      method: "POST",
      body: file,
      headers: {
        "Content-Type": "application/octet-stream",
        "X-File-Name": encodeURIComponent(file.name),
      },
    });
  },
  preview(id: string, signal?: AbortSignal) {
    return requestData<ChatbotDocumentPreview>(
      `${base}/${encodeURIComponent(id)}`,
      { signal },
    );
  },
};
