import { getChatbotCaseAssignees } from "@/modules/chatbot/application/ServerChatbotCaseService";
import { chatbotRoute } from "@/modules/chatbot/api/ChatbotRouteTransport";
export async function GET(request: Request) {
  return chatbotRoute(request, getChatbotCaseAssignees);
}
