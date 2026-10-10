import {
  getChatbotCase,
  saveChatbotCaseState,
} from "@/modules/chatbot/application/ServerChatbotCaseService";
import {
  chatbotRoute,
  chatbotBody,
} from "@/modules/chatbot/api/ChatbotRouteTransport";
export async function GET(
  request: Request,
  context: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await context.params;
  return chatbotRoute(request, (user) => getChatbotCase(user, caseId));
}
export async function PATCH(
  request: Request,
  context: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await context.params;
  return chatbotRoute(request, async (user) =>
    saveChatbotCaseState(user, caseId, await chatbotBody(request)),
  );
}
