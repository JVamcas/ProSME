import { getChatbotKnowledgeRelease } from "@/modules/chatbot/application/ServerChatbotKnowledgeService";
import { chatbotRoute } from "@/modules/chatbot/api/ChatbotRouteTransport";

export async function GET(
  request: Request,
  context: { params: Promise<{ releaseId: string }> },
) {
  const { releaseId } = await context.params;
  return chatbotRoute(request, (user) =>
    getChatbotKnowledgeRelease(user, releaseId),
  );
}
