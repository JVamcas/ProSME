import { assignChatbotCase } from "@/modules/chatbot/application/ServerChatbotCaseService";
import {
  chatbotRoute,
  chatbotBody,
} from "@/modules/chatbot/api/ChatbotRouteTransport";
export async function POST(
  request: Request,
  context: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await context.params;
  return chatbotRoute(request, async (user) =>
    assignChatbotCase(user, caseId, await chatbotBody(request)),
  );
}
