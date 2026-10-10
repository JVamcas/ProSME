import type { ChatbotPassageSelector } from "@/modules/chatbot/domain/ChatbotAnswer";
import { vi } from "vitest";
import {
  installChatbotRuntimeFixture,
  MemoryChatbotStorage,
} from "./ChatbotRuntimeFixture";
import { updateChatbotResources } from "@/modules/chatbot/application/ServerChatbotResourceService";
import { synchronizeChatbotResources } from "@/modules/chatbot/application/SynchronizeChatbotResources";
import { createKnowledgeRuntime } from "@/modules/chatbot/application/ServerChatbotKnowledgeRuntime";
export async function installChatbotConversationFixture(url: string) {
  const fixture = await installChatbotRuntimeFixture(url);
  await updateChatbotResources(fixture.actor, {
    resourceKeys: ["faq:1"],
    active: true,
  });
  const storage = new MemoryChatbotStorage();
  const synchronized = await synchronizeChatbotResources(() => storage);
  const releaseId = synchronized.candidateId!;
  const dependencies = {
    runtime: createKnowledgeRuntime(() => storage),
    selector: {
      select: vi.fn<ChatbotPassageSelector["select"]>(async (input) => ({
        status: "ANSWER",
        passageIds: [input.candidates[0].id],
      })),
    },
  };
  return { fixture, releaseId, dependencies };
}
