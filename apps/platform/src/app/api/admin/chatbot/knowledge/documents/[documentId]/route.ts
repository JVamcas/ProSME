import { chatbotRoute } from "@/modules/chatbot/api/ChatbotRouteTransport";
import { getChatbotDocument } from "@/modules/chatbot/application/ServerChatbotDocumentService";

export async function GET(
  request: Request,
  context: { params: Promise<{ documentId: string }> },
) {
  return chatbotRoute(request, async (user) =>
    getChatbotDocument(user, (await context.params).documentId),
  );
}
