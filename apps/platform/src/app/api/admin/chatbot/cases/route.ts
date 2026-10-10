import { getChatbotCases } from "@/modules/chatbot/application/ServerChatbotCaseService";
import { chatbotRoute } from "@/modules/chatbot/api/ChatbotRouteTransport";
export async function GET(request: Request) {
  return chatbotRoute(request, (user) =>
    getChatbotCases(
      user,
      Object.fromEntries(new URL(request.url).searchParams),
    ),
  );
}
