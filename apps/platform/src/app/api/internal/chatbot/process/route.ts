import { reconcileChatbotSources } from "@/modules/chatbot/application/ServerChatbotSourceJobService";
import { cleanupChatbotRetention } from "@/modules/chatbot/application/ServerChatbotPolicyService";
import { chatbotProcessorRoute } from "@/modules/chatbot/api/ChatbotProcessorTransport";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  return chatbotProcessorRoute(request, async () => {
    const [sources, retention] = await Promise.all([
      reconcileChatbotSources(),
      cleanupChatbotRetention(),
    ]);
    return { sources, retention };
  });
}
