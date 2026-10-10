import { submitChatbotQuestion } from "@/modules/chatbot/application/ServerChatbotConversationService";
import { chatbotBody } from "@/modules/chatbot/api/ChatbotRouteTransport";
import { chatbotPublicRoute } from "@/modules/chatbot/api/ChatbotPublicTransport";
import { publicChatbotTurnResponse } from "@/modules/chatbot/api/ChatbotConversationResponse";
export async function POST(
  request: Request,
  context: { params: Promise<{ conversationId: string }> },
) {
  const { conversationId } = await context.params;
  return chatbotPublicRoute(async () =>
    publicChatbotTurnResponse(
      await submitChatbotQuestion(
        conversationId,
        request.headers.get("authorization"),
        await chatbotBody(request),
      ),
    ),
  );
}
