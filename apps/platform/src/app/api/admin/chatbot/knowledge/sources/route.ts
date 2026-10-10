import { getChatbotKnowledgeSources } from "@/modules/chatbot/application/ServerChatbotKnowledgeService";
import { chatbotRoute } from "@/modules/chatbot/api/ChatbotRouteTransport";

export async function GET(request: Request) {
  return chatbotRoute(request, (user) =>
    getChatbotKnowledgeSources(
      user,
      Object.fromEntries(new URL(request.url).searchParams),
    ),
  );
}
