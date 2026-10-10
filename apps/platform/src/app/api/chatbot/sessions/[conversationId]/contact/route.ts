import { setChatbotConversationContact } from "@/modules/chatbot/application/ServerChatbotConversationService";
import { chatbotBody } from "@/modules/chatbot/api/ChatbotRouteTransport";
import { chatbotPublicRoute } from "@/modules/chatbot/api/ChatbotPublicTransport";
export async function POST(
  request: Request,
  context: { params: Promise<{ conversationId: string }> },
) {
  const { conversationId } = await context.params;
  return chatbotPublicRoute(async () =>
    setChatbotConversationContact(
      conversationId,
      request.headers.get("authorization"),
      await chatbotBody(request),
    ),
  );
}
