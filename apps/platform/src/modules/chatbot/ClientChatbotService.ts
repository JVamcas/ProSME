"use client";
import { postData, requestData } from "@/lib/client-http";
import type {
  KnowledgeRelease,
  KnowledgeSelection,
  KnowledgeSourcePage,
  KnowledgeWorkspace,
  KnowledgeChange,
} from "./domain/ChatbotKnowledge";

const base = "/api/admin/chatbot/knowledge";

export const clientChatbotService = {
  workspace: (signal?: AbortSignal) =>
    requestData<KnowledgeWorkspace>(base, { signal }),
  sources: (
    kind: "funding-call" | "faq",
    after?: string,
    signal?: AbortSignal,
  ) => {
    const query = new URLSearchParams({ kind });
    if (after) query.set("after", after);
    return requestData<KnowledgeSourcePage>(`${base}/sources?${query}`, {
      signal,
    });
  },
  prepare: (selection: KnowledgeSelection) =>
    postData<KnowledgeRelease, KnowledgeSelection>(base, selection),
  detail: (id: string, signal?: AbortSignal) =>
    requestData<{ release: KnowledgeRelease; changes: KnowledgeChange[] }>(
      `${base}/${encodeURIComponent(id)}`,
      { signal },
    ),
  approve: (release: Pick<KnowledgeRelease, "id" | "contentHash">) =>
    postData<KnowledgeRelease, { contentHash: string }>(
      `${base}/${encodeURIComponent(release.id)}/approve`,
      { contentHash: release.contentHash },
    ),
  publish: (input: {
    id: string;
    contentHash: string;
    expectedEpoch: string;
  }) =>
    postData(`${base}/${encodeURIComponent(input.id)}/publish`, {
      contentHash: input.contentHash,
      expectedEpoch: input.expectedEpoch,
    }),
  withdraw: (id: string) =>
    postData(`${base}/${encodeURIComponent(id)}/withdraw`, {}),
};
