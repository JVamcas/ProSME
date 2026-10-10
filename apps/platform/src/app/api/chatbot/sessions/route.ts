import { startChatbotConversation } from "@/modules/chatbot/application/ServerChatbotConversationService";
import { getChatbotPublicNotice } from "@/modules/chatbot/application/ServerChatbotConversationService";
import { chatbotBody } from "@/modules/chatbot/api/ChatbotRouteTransport";
import {
  chatbotPublicRoute,
  chatbotNetworkIdentity,
} from "@/modules/chatbot/api/ChatbotPublicTransport";
export async function POST(request: Request) {
  return chatbotPublicRoute(async () =>
    startChatbotConversation(
      await chatbotBody(request),
      chatbotNetworkIdentity(request),
    ),
  );
}

export async function GET() {
  return chatbotPublicRoute(getChatbotPublicNotice);
}
